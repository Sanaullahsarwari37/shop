import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  categories,
  products,
  purchaseItems,
  saleItems,
  sales,
} from "../db/schema.js";
import { toMoney } from "../utils/money.js";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  perPrice: z
    .string()
    .or(z.number())
    .optional()
    .transform((v) => toMoney(v ?? "0")),
});

export async function categoryRoutes(app: FastifyInstance) {
  app.get("/api/categories", async () => {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        perPrice: categories.perPrice,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        productCount: sql<number>`count(${products.id})::int`,
      })
      .from(categories)
      .leftJoin(products, eq(categories.id, products.categoryId))
      .groupBy(categories.id)
      .orderBy(categories.name);
    return rows;
  });

  app.post("/api/categories", async (req, reply) => {
    const body = categorySchema.parse(req.body);
    try {
      const [created] = await db.insert(categories).values(body).returning();
      return reply.status(201).send(created);
    } catch {
      return reply.status(400).send({ error: "Category name already exists" });
    }
  });

  app.patch("/api/categories/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = categorySchema.partial().parse(req.body);
    const [updated] = await db
      .update(categories)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!updated) return reply.status(404).send({ error: "Category not found" });
    return updated;
  });

  /**
   * Delete category.
   * Query ?force=true also deletes all products in the category
   * (and their related purchase/sale line items; empty sales cleaned up).
   */
  app.delete("/api/categories/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const force = (req.query as any)?.force === "true" || (req.query as any)?.force === true;

    const productRows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id));

    if (productRows.length > 0 && !force) {
      return reply.status(400).send({
        error:
          "Category has products. Delete products first, or use force delete to remove category and all related products/history.",
        productCount: productRows.length,
      });
    }

    try {
      await db.transaction(async (tx) => {
        if (productRows.length > 0) {
          const pids = productRows.map((p) => p.id);
          await tx.delete(saleItems).where(inArray(saleItems.productId, pids));
          await tx.delete(purchaseItems).where(inArray(purchaseItems.productId, pids));
          // remove sales with no remaining items
          await tx.execute(sql`
            DELETE FROM sales WHERE id NOT IN (SELECT DISTINCT sale_id FROM sale_items)
          `);
          await tx.delete(products).where(inArray(products.id, pids));
        }
        await tx.delete(categories).where(eq(categories.id, id));
      });
      return { success: true };
    } catch (e: any) {
      return reply.status(400).send({ error: e.message || "Failed to delete category" });
    }
  });
}
