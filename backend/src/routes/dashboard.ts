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
  // Prefer local calendar day (avoid UTC midnight shifting the day)
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

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (req) => {
    const q = (req.query || {}) as { date?: string };
    const todayBounds = dayBounds(); // always real today
    const selectedBounds = dayBounds(q.date); // selected day or today
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

    // Sales for the selected day
    const daySalesRaw = await db
      .select({
        id: sales.id,
        type: sales.type,
        totalRevenue: sales.totalRevenue,
        totalProfit: sales.totalProfit,
        soldAt: sales.soldAt,
        customerName: customers.name,
        note: sales.note,
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
      .where(
        and(
          gte(sales.soldAt, selectedBounds.start),
          lte(sales.soldAt, selectedBounds.end)
        )
      )
      .orderBy(desc(sales.soldAt))
      .limit(50);

    // Debt payments (return of loan) for the selected day — decreases outstanding
    const dayPaymentsRaw = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        note: payments.note,
        paidAt: payments.paidAt,
        customerName: customers.name,
      })
      .from(payments)
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .where(
        and(
          gte(payments.paidAt, selectedBounds.start),
          lte(payments.paidAt, selectedBounds.end)
        )
      )
      .orderBy(desc(payments.paidAt))
      .limit(50);

    // Today's payments total (cash collected against debt)
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

    // Unified day activity: sales + debt payments
    const daySalesList = [
      ...daySalesRaw.map((s) => ({
        kind: "sale" as const,
        id: `sale-${s.id}`,
        type: s.type,
        itemNames: s.itemNames,
        note: s.note,
        customerName: s.customerName,
        amount: s.totalRevenue,
        profit: s.totalProfit,
        at: s.soldAt,
      })),
      ...dayPaymentsRaw.map((p) => ({
        kind: "payment" as const,
        id: `pay-${p.id}`,
        type: "payment",
        itemNames: p.note || "Debt payment",
        note: p.note,
        customerName: p.customerName,
        amount: p.amount,
        profit: "0",
        at: p.paidAt,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const recentSales = await db
      .select({
        id: sales.id,
        type: sales.type,
        totalRevenue: sales.totalRevenue,
        totalProfit: sales.totalProfit,
        soldAt: sales.soldAt,
        customerName: customers.name,
        note: sales.note,
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
      .orderBy(desc(sales.soldAt))
      .limit(8);

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

    // Days that have any sales (for calendar markers) — last 90 days
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
      /** Always real calendar-today — never mixed with selected date */
      today: {
        ...today,
        paymentsCollected: todayPayments.total,
        paymentCount: todayPayments.count,
      },
      yesterday,
      /** Stats for the date chosen on the calendar */
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
      lowStockList,
      daySalesList,
      recentSales,
      topDebtors,
    };
  });
}
