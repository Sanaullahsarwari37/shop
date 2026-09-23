import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { purchases, purchaseItems, products } from "../db/schema.js";
import { recordPurchase } from "../services/inventory.js";
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
});

export async function purchaseRoutes(app: FastifyInstance) {
  app.post("/api/purchases", async (req, reply) => {
    try {
      const body = createSchema.parse(req.body);
      const result = await recordPurchase({
        items: body.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitCost: toMoney(i.unitCost),
        })),
        note: body.note,
        reference: body.reference,
      });
      return reply.status(201).send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message || "Failed to record purchase" });
    }
  });

  app.get("/api/purchases", async () => {
    return await db
      .select()
      .from(purchases)
      .orderBy(desc(purchases.purchasedAt))
      .limit(100);
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
}
