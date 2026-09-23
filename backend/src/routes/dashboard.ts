import { FastifyInstance } from "fastify";
import { eq, and, gte, lte, sql, desc, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  products,
  categories,
  sales,
  customers,
  saleItems,
  payments,
} from "../db/schema.js";

function dayBounds(dateStr?: string) {
  let d: Date;
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, day] = dateStr.split("-").map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0, 0);
  } else {
    d = new Date();
  }
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end, date: start };
}

function shiftDay(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function daySalesStats(start: Date, end: Date) {
  const [row] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${sales.totalRevenue}), 0)::numeric(12,2)`,
      cost: sql<string>`coalesce(sum(${sales.totalCost}), 0)::numeric(12,2)`,
      profit: sql<string>`coalesce(sum(${sales.totalProfit}), 0)::numeric(12,2)`,
      count: sql<number>`count(*)::int`,
      itemsSold: sql<number>`coalesce(sum(
        (select sum(si.quantity) from sale_items si where si.sale_id = ${sales.id})
      ), 0)::int`,
    })
    .from(sales)
    .where(and(gte(sales.soldAt, start), lte(sales.soldAt, end)));

  const [debit] = await db
    .select({
      total: sql<string>`coalesce(sum(${sales.totalRevenue}), 0)::numeric(12,2)`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.type, "debit"),
        gte(sales.soldAt, start),
        lte(sales.soldAt, end)
      )
    );

  return {
    sales: row.revenue,
    cost: row.cost,
    profit: row.profit,
    transactions: row.count,
    itemsSold: row.itemsSold,
    debit: debit.total,
    debitTransactions: debit.count,
  };
}

async function periodProfit(start: Date, end: Date) {
  const [row] = await db
    .select({
      profit: sql<string>`coalesce(sum(${sales.totalProfit}), 0)::numeric(12,2)`,
      revenue: sql<string>`coalesce(sum(${sales.totalRevenue}), 0)::numeric(12,2)`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(and(gte(sales.soldAt, start), lte(sales.soldAt, end)));
  return row;
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (req) => {
    const q = (req.query || {}) as { date?: string; period?: string };
    const todayBounds = dayBounds();
    const selectedBounds = dayBounds(q.date);
    const yesterdayDate = shiftDay(todayBounds.date, -1);
    const yesterdayBounds = dayBounds(toYmd(yesterdayDate));
    const prevSelectedDate = shiftDay(selectedBounds.date, -1);
    const prevSelectedBounds = dayBounds(toYmd(prevSelectedDate));

    const [inv] = await db
      .select({
        totalProducts: sql<number>`count(*)::int`,
        totalQty: sql<number>`coalesce(sum(${products.quantity}), 0)::int`,
        lowStock: sql<number>`count(*) filter (where ${products.quantity} > 0 and ${products.quantity} <= ${products.minStock})::int`,
        outOfStock: sql<number>`count(*) filter (where ${products.quantity} = 0)::int`,
        stockValue: sql<string>`coalesce(sum(${products.quantity} * ${products.avgCost}), 0)::numeric(12,2)`,
        potentialRevenue: sql<string>`coalesce(sum(${products.quantity} * ${products.sellingPrice}), 0)::numeric(12,2)`,
      })
      .from(products)
      .where(eq(products.isActive, true));

    const [catCount] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(categories);

    const today = await daySalesStats(todayBounds.start, todayBounds.end);
    const selected = await daySalesStats(
      selectedBounds.start,
      selectedBounds.end
    );
    const yesterday = await daySalesStats(
      yesterdayBounds.start,
      yesterdayBounds.end
    );
    const previousDay = await daySalesStats(
      prevSelectedBounds.start,
      prevSelectedBounds.end
    );

    // Profit periods: today, 7 days, 30 days
    const weekStart = shiftDay(todayBounds.date, -6);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = shiftDay(todayBounds.date, -29);
    monthStart.setHours(0, 0, 0, 0);

    const profitToday = await periodProfit(todayBounds.start, todayBounds.end);
    const profitWeek = await periodProfit(weekStart, todayBounds.end);
    const profitMonth = await periodProfit(monthStart, todayBounds.end);

    const [outstanding] = await db
      .select({
        total: sql<string>`coalesce(sum(${customers.outstandingBalance}), 0)::numeric(12,2)`,
        customers: sql<number>`count(*) filter (where ${customers.outstandingBalance} > 0)::int`,
      })
      .from(customers);

    const lowStockList = await db
      .select({
        id: products.id,
        name: products.name,
        quantity: products.quantity,
        minStock: products.minStock,
      })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.quantity} <= ${products.minStock}`
        )
      )
      .orderBy(products.quantity)
      .limit(10);

    // Today's payments total (collected debit)
    const [todayPayments] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}), 0)::numeric(12,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(
        and(
          gte(payments.paidAt, todayBounds.start),
          lte(payments.paidAt, todayBounds.end)
        )
      );

    const [selectedPayments] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}), 0)::numeric(12,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(
        and(
          gte(payments.paidAt, selectedBounds.start),
          lte(payments.paidAt, selectedBounds.end)
        )
      );

    // All-time collected (optional summary)
    const [allCollected] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}), 0)::numeric(12,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments);

    const topDebtors = await db
      .select({
        id: customers.id,
        name: customers.name,
        outstandingBalance: customers.outstandingBalance,
      })
      .from(customers)
      .where(gt(customers.outstandingBalance, "0"))
      .orderBy(desc(customers.outstandingBalance))
      .limit(5);

    const activeDays = await db
      .select({
        day: sql<string>`to_char(${sales.soldAt}, 'YYYY-MM-DD')`,
      })
      .from(sales)
      .where(gte(sales.soldAt, shiftDay(todayBounds.date, -90)))
      .groupBy(sql`to_char(${sales.soldAt}, 'YYYY-MM-DD')`);

    return {
      inventory: {
        totalProducts: inv.totalProducts,
        totalQty: inv.totalQty,
        lowStock: inv.lowStock,
        outOfStock: inv.outOfStock,
        categories: catCount.c,
        stockValue: inv.stockValue,
        potentialRevenue: inv.potentialRevenue,
      },
      today: {
        ...today,
        paymentsCollected: todayPayments.total,
        paymentCount: todayPayments.count,
      },
      yesterday,
      selected: {
        date: toYmd(selectedBounds.date),
        ...selected,
        paymentsCollected: selectedPayments.total,
        paymentCount: selectedPayments.count,
      },
      previousDay: {
        date: toYmd(prevSelectedBounds.date),
        ...previousDay,
      },
      isTodaySelected: toYmd(selectedBounds.date) === toYmd(todayBounds.date),
      activeDays: activeDays.map((r) => r.day),
      outstanding: {
        total: outstanding.total,
        customers: outstanding.customers,
      },
      /** Money previously owed that was actually collected */
      collectedDebit: {
        today: todayPayments.total,
        todayCount: todayPayments.count,
        allTime: allCollected.total,
        allTimeCount: allCollected.count,
      },
      profitPeriods: {
        today: profitToday,
        week: profitWeek,
        month: profitMonth,
      },
      lowStockList,
      topDebtors,
    };
  });
}
