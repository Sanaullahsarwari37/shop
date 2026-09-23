import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories, products } from "../db/schema.js";
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

  app.delete("/api/categories/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const [count] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.categoryId, id));
    if (count.c > 0) {
      return reply.status(400).send({
        error:
          "Unable to delete this category because products are still assigned to it.",
      });
    }
    await db.delete(categories).where(eq(categories.id, id));
    return { success: true };
  });
}
