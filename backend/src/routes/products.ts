import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, ilike, and, or, sql, desc, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { products, categories, saleItems, purchaseItems, sales } from "../db/schema.js";
import { toMoney } from "../utils/money.js";

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  purchasePrice: z.string().or(z.number()).transform((v) => toMoney(v)),
  sellingPrice: z.string().or(z.number()).transform((v) => toMoney(v)),
  quantity: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function productRoutes(app: FastifyInstance) {
  // List + search + filter
  app.get("/api/products", async (req, reply) => {
    const q = req.query as any;
    const search = q.search || "";
    const categoryId = q.categoryId ? Number(q.categoryId) : null;
    const stockStatus = q.stockStatus; // all | in_stock | low | out
    const sort = q.sort || "name";
    const order = q.order === "desc" ? "desc" : "asc";

    let query = db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        categoryId: products.categoryId,
        categoryName: categories.name,
        purchasePrice: products.purchasePrice,
        sellingPrice: products.sellingPrice,
        avgCost: products.avgCost,
        quantity: products.quantity,
        minStock: products.minStock,
        description: products.description,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        costValue: sql<string>`(${products.quantity} * ${products.avgCost})::numeric(12,2)`,
        saleValue: sql<string>`(${products.quantity} * ${products.sellingPrice})::numeric(12,2)`,
        potentialProfit: sql<string>`((${products.quantity} * ${products.sellingPrice}) - (${products.quantity} * ${products.avgCost}))::numeric(12,2)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .$dynamic();

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.barcode, `%${search}%`)
        )
      );
    }
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (stockStatus === "out") conditions.push(eq(products.quantity, 0));
    if (stockStatus === "low")
      conditions.push(
        and(
          sql`${products.quantity} > 0`,
          sql`${products.quantity} <= ${products.minStock}`
        )
      );
    if (stockStatus === "in_stock") conditions.push(sql`${products.quantity} > ${products.minStock}`);

    if (conditions.length) query = query.where(and(...conditions));

    const sortMap: any = {
      name: products.name,
      quantity: products.quantity,
      sellingPrice: products.sellingPrice,
      avgCost: products.avgCost,
      createdAt: products.createdAt,
    };
    const sortCol = sortMap[sort] || products.name;
    query = order === "desc" ? query.orderBy(desc(sortCol)) : query.orderBy(asc(sortCol));

    const rows = await query;
    return rows;
  });

  // Get one
  app.get("/api/products/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const [row] = await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id));
    if (!row) return reply.status(404).send({ error: "Product not found" });
    return row;
  });

  // Create
  app.post("/api/products", async (req, reply) => {
    const body = productSchema.parse(req.body);
    const [created] = await db
      .insert(products)
      .values({
        ...body,
        avgCost: body.purchasePrice, // initial avg = purchase price
      })
      .returning();
    return reply.status(201).send(created);
  });

  // Update
  app.patch("/api/products/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = productSchema.partial().parse(req.body);
    // Keep weighted avg in sync when purchase price is edited from the form
    const patch: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.purchasePrice != null) {
      patch.avgCost = body.purchasePrice;
    }
    const [updated] = await db
      .update(products)
      .set(patch)
      .where(eq(products.id, id))
      .returning();
    if (!updated) return reply.status(404).send({ error: "Product not found" });
    return updated;
  });

  // Force delete product + related purchase/sale line items (history)
  app.delete("/api/products/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const [existing] = await db.select().from(products).where(eq(products.id, id));
    if (!existing) return reply.status(404).send({ error: "Product not found" });

    try {
      await db.transaction(async (tx) => {
        // Remove sale lines for this product
        const linkedSales = await tx
          .select({ saleId: saleItems.saleId })
          .from(saleItems)
          .where(eq(saleItems.productId, id));

        await tx.delete(saleItems).where(eq(saleItems.productId, id));
        await tx.delete(purchaseItems).where(eq(purchaseItems.productId, id));

        // Clean up sales that no longer have any items
        const saleIds = [...new Set(linkedSales.map((r) => r.saleId))];
        for (const saleId of saleIds) {
          const [remaining] = await tx
            .select({ c: sql<number>`count(*)::int` })
            .from(saleItems)
            .where(eq(saleItems.saleId, saleId));
          if (!remaining || remaining.c === 0) {
            await tx.delete(sales).where(eq(sales.id, saleId));
          } else {
            // Recalculate sale totals from remaining items
            const [sums] = await tx
              .select({
                totalRevenue: sql<string>`coalesce(sum(${saleItems.revenue}), 0)::numeric(12,2)`,
                totalCost: sql<string>`coalesce(sum(${saleItems.cost}), 0)::numeric(12,2)`,
                totalProfit: sql<string>`coalesce(sum(${saleItems.profit}), 0)::numeric(12,2)`,
              })
              .from(saleItems)
              .where(eq(saleItems.saleId, saleId));
            await tx
              .update(sales)
              .set({
                totalRevenue: sums.totalRevenue,
                totalCost: sums.totalCost,
                totalProfit: sums.totalProfit,
              })
              .where(eq(sales.id, saleId));
          }
        }

        await tx.delete(products).where(eq(products.id, id));
      });
      return { success: true };
    } catch (e: any) {
      return reply.status(400).send({
        error: e.message || "Failed to delete product",
      });
    }
  });
}
