import { FastifyInstance } from "fastify";
import { and, gte, lte, eq, sql, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { sales, saleItems, products, categories, customers, payments } from "../db/schema.js";

export async function reportRoutes(app: FastifyInstance) {
  // Daily / range range report
  app.get("/api/reports", async (req) => {
    const q = req.query as any;
    const from = q.from ? new Date(q.from) : new Date(new Date().setDate(1));
    const to = q.to ? new Date(q.to) : new Date();

    // Sales summary
    const [summary] = await db
      .select({
        revenue: sql<string>`coalesce(sum(${sales.totalRevenue}), 0)::numeric(12,2)`,
        cost: sql<string>`coalesce(sum(${sales.totalCost}), 0)::numeric(12,2)`,
        profit: sql<string>`coalesce(sum(${sales.totalProfit}), 0)::numeric(12,2)`,
        transactions: sql<number>`count(*)::int`,
        cashRevenue: sql<string>`coalesce(sum(${sales.totalRevenue}) filter (where ${sales.type} = 'cash'), 0)::numeric(12,2)`,
        debitRevenue: sql<string>`coalesce(sum(${sales.totalRevenue}) filter (where ${sales.type} = 'debit'), 0)::numeric(12,2)`,
      })
      .from(sales)
      .where(and(gte(sales.soldAt, from), lte(sales.soldAt, to)));

    // Payments in period
    const [pay] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}), 0)::numeric(12,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(and(gte(payments.paidAt, from), lte(payments.paidAt, to)));

    // Best selling products
    const bestSellers = await db
      .select({
        productId: saleItems.productId,
        productName: products.name,
        quantity: sql<number>`sum(${saleItems.quantity})::int`,
        revenue: sql<string>`sum(${saleItems.revenue})::numeric(12,2)`,
        profit: sql<string>`sum(${saleItems.profit})::numeric(12,2)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(and(gte(sales.soldAt, from), lte(sales.soldAt, to)))
      .groupBy(saleItems.productId, products.name)
      .orderBy(desc(sql`sum(${saleItems.quantity})`))
      .limit(10);

    // By category
    const byCategory = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        revenue: sql<string>`coalesce(sum(${saleItems.revenue}), 0)::numeric(12,2)`,
        profit: sql<string>`coalesce(sum(${saleItems.profit}), 0)::numeric(12,2)`,
        quantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)::int`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(gte(sales.soldAt, from), lte(sales.soldAt, to)))
      .groupBy(categories.id, categories.name)
      .orderBy(desc(sql`sum(${saleItems.revenue})`));

    // Daily trend
    const dailyTrend = await db
      .select({
        date: sql<string>`date(${sales.soldAt})`,
        revenue: sql<string>`sum(${sales.totalRevenue})::numeric(12,2)`,
        profit: sql<string>`sum(${sales.totalProfit})::numeric(12,2)`,
        transactions: sql<number>`count(*)::int`,
      })
      .from(sales)
      .where(and(gte(sales.soldAt, from), lte(sales.soldAt, to)))
      .groupBy(sql`date(${sales.soldAt})`)
      .orderBy(sql`date(${sales.soldAt})`);

    return {
      from,
      to,
      summary: {
        ...summary,
        paymentsReceived: pay.total,
        paymentCount: pay.count,
      },
      bestSellers,
      byCategory,
      dailyTrend,
    };
  });
}
