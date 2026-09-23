import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { purchases, purchaseItems, products, categories } from "../db/schema.js";
import {
  recordPurchase,
  deletePurchase,
  deletePurchaseItem,
} from "../services/inventory.js";
import { toMoney } from "../utils/money.js";

const itemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitCost: z.string().or(z.number()),
});

const createSchema = z.object({
  items: z.array(itemSchema).min(1),
  note: z.string().optional(),
  reference: z.string().optional(),
  purchasedAt: z.string().optional(), // ISO or yyyy-MM-dd
});

export async function purchaseRoutes(app: FastifyInstance) {
  app.post("/api/purchases", async (req, reply) => {
    try {
      const body = createSchema.parse(req.body);
      let purchasedAt: Date | undefined;
      if (body.purchasedAt) {
        const d = new Date(body.purchasedAt);
        if (!isNaN(d.getTime())) purchasedAt = d;
      }
      const result = await recordPurchase({
        items: body.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitCost: toMoney(i.unitCost),
        })),
        note: body.note,
        reference: body.reference,
        purchasedAt: purchasedAt || new Date(),
      });
      return reply.status(201).send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message || "Failed to record purchase" });
    }
  });

  app.get("/api/purchases", async () => {
    const list = await db
      .select()
      .from(purchases)
      .orderBy(desc(purchases.purchasedAt))
      .limit(200);

    const enriched = await Promise.all(
      list.map(async (p) => {
        const items = await db
          .select({
            id: purchaseItems.id,
            productId: purchaseItems.productId,
            productName: products.name,
            categoryName: categories.name,
            quantity: purchaseItems.quantity,
            unitCost: purchaseItems.unitCost,
            totalCost: purchaseItems.totalCost,
          })
          .from(purchaseItems)
          .leftJoin(products, eq(purchaseItems.productId, products.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(purchaseItems.purchaseId, p.id));

        const first = items[0];
        return {
          ...p,
          items,
          productName: first?.productName || "—",
          categoryName: first?.categoryName || "—",
          quantity: items.reduce((s, i) => s + (i.quantity || 0), 0),
          unitCost: first?.unitCost || "0",
        };
      })
    );

    return enriched;
  });

  app.get("/api/purchases/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    if (!purchase) return reply.status(404).send({ error: "Not found" });

    const items = await db
      .select({
        id: purchaseItems.id,
        productId: purchaseItems.productId,
        productName: products.name,
        quantity: purchaseItems.quantity,
        unitCost: purchaseItems.unitCost,
        totalCost: purchaseItems.totalCost,
      })
      .from(purchaseItems)
      .leftJoin(products, eq(purchaseItems.productId, products.id))
      .where(eq(purchaseItems.purchaseId, id));

    return { ...purchase, items };
  });

  /** Delete entire purchase (+ items) and reverse stock */
  app.delete("/api/purchases/:id", async (req, reply) => {
    try {
      const id = Number((req.params as any).id);
      const result = await deletePurchase(id);
      return result;
    } catch (e: any) {
      return reply.status(400).send({ error: e.message || "Failed to delete purchase" });
    }
  });

  /** Delete a single purchase line item */
  app.delete("/api/purchase-items/:id", async (req, reply) => {
    try {
      const id = Number((req.params as any).id);
      const result = await deletePurchaseItem(id);
      return result;
    } catch (e: any) {
      return reply.status(400).send({ error: e.message || "Failed to delete purchase item" });
    }
  });

  /** Bulk delete purchases */
  app.post("/api/purchases/delete-bulk", async (req, reply) => {
    try {
      const body = z.object({ ids: z.array(z.number().int().positive()).min(1) }).parse(req.body);
      const results: { id: number; ok: boolean; error?: string }[] = [];
      for (const id of body.ids) {
        try {
          await deletePurchase(id);
          results.push({ id, ok: true });
        } catch (e: any) {
          results.push({ id, ok: false, error: e.message });
        }
      }
      return { results };
    } catch (e: any) {
      return reply.status(400).send({ error: e.message || "Bulk delete failed" });
    }
  });
}
