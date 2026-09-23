import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { sales, saleItems, products, customers } from "../db/schema.js";
import { recordSale } from "../services/inventory.js";
import { toMoney } from "../utils/money.js";

const saleItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.string().or(z.number()).optional(),
});

const createSaleSchema = z.object({
  type: z.enum(["cash", "debit"]),
  customerId: z.number().int().positive().optional(),
  items: z.array(saleItemSchema).min(1),
  note: z.string().optional(),
  reference: z.string().optional(),
});

export async function salesRoutes(app: FastifyInstance) {
  // Create sale (cash or debit)
  app.post("/api/sales", async (req, reply) => {
    try {
      const body = createSaleSchema.parse(req.body);
      const result = await recordSale({
        type: body.type,
        customerId: body.customerId,
        items: body.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice ? toMoney(i.unitPrice) : undefined,
        })),
        note: body.note,
        reference: body.reference,
      });
      return reply.status(201).send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message || "Failed to record sale" });
    }
  });

  // List sales
  app.get("/api/sales", async (req) => {
    const q = req.query as any;
    const from = q.from ? new Date(q.from) : null;
    const to = q.to ? new Date(q.to) : null;
    const type = q.type; // cash | debit

    let query = db
      .select({
        id: sales.id,
        type: sales.type,
        customerId: sales.customerId,
        customerName: customers.name,
        totalRevenue: sales.totalRevenue,
        totalCost: sales.totalCost,
        totalProfit: sales.totalProfit,
        note: sales.note,
        soldAt: sales.soldAt,
        itemNames: sql<string>`coalesce(
          (select string_agg(p.name || ' ×' || si.quantity::text, ', ')
           from sale_items si
           join products p on p.id = si.product_id
           where si.sale_id = ${sales.id}),
          coalesce(${sales.note}, '—')
        )`,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .$dynamic();

    const conditions = [];
    if (from) conditions.push(gte(sales.soldAt, from));
    if (to) conditions.push(lte(sales.soldAt, to));
    if (type) conditions.push(eq(sales.type, type));

    if (conditions.length) query = query.where(and(...conditions));
    return await query.orderBy(desc(sales.soldAt)).limit(200);
  });

  // Sale details
  app.get("/api/sales/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const [sale] = await db
      .select()
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.id, id));
    if (!sale) return reply.status(404).send({ error: "Sale not found" });

    const items = await db
      .select({
        id: saleItems.id,
        productId: saleItems.productId,
        productName: products.name,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        unitCost: saleItems.unitCost,
        revenue: saleItems.revenue,
        cost: saleItems.cost,
        profit: saleItems.profit,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, id));

    return { ...sale, items };
  });
}
