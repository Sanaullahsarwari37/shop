import { eq, sql, and, gte, lte, desc, asc, like, or, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  products,
  categories,
  purchases,
  purchaseItems,
  sales,
  saleItems,
  customers,
  payments,
} from "../db/schema.js";
import { moneyAdd, moneyMul, moneySub, moneyDiv, toMoney, parseMoney } from "../utils/money.js";

/**
 * Weighted Average Cost update when new stock arrives.
 * NewAvg = (OldQty * OldAvg + NewQty * NewCost) / (OldQty + NewQty)
 */
export function calculateNewAvgCost(
  oldQty: number,
  oldAvg: string,
  newQty: number,
  newCost: string
): string {
  if (oldQty + newQty === 0) return toMoney(newCost);
  const totalValue = parseMoney(oldAvg) * oldQty + parseMoney(newCost) * newQty;
  return (totalValue / (oldQty + newQty)).toFixed(2);
}

/**
 * Record a purchase (stock-in) inside a transaction
 */
export async function recordPurchase(input: {
  items: Array<{ productId: number; quantity: number; unitCost: string }>;
  note?: string;
  reference?: string;
  purchasedAt?: Date;
}) {
  return await db.transaction(async (tx) => {
    let totalCost = "0.00";

    const [purchase] = await tx
      .insert(purchases)
      .values({
        reference: input.reference || null,
        note: input.note || null,
        totalCost: "0.00",
        purchasedAt: input.purchasedAt || new Date(),
      })
      .returning();

    for (const item of input.items) {
      if (item.quantity <= 0) throw new Error("Quantity must be positive");
      const unitCost = toMoney(item.unitCost);
      if (parseMoney(unitCost) < 0) throw new Error("Unit cost cannot be negative");

      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .for("update");

      if (!product) throw new Error(`Product ${item.productId} not found`);

      const lineTotal = moneyMul(unitCost, item.quantity);
      totalCost = moneyAdd(totalCost, lineTotal);

      const newQty = product.quantity + item.quantity;
      const newAvg = calculateNewAvgCost(
        product.quantity,
        product.avgCost,
        item.quantity,
        unitCost
      );

      await tx
        .update(products)
        .set({
          quantity: newQty,
          avgCost: newAvg,
          purchasePrice: unitCost, // last purchase price
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));

      await tx.insert(purchaseItems).values({
        purchaseId: purchase.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost,
        totalCost: lineTotal,
      });
    }

    await tx
      .update(purchases)
      .set({ totalCost })
      .where(eq(purchases.id, purchase.id));

    return { purchaseId: purchase.id, totalCost };
  });
}

/**
 * Record a sale (cash or debit) inside a transaction
 */
export async function recordSale(input: {
  type: "cash" | "debit";
  customerId?: number;
  items: Array<{ productId: number; quantity: number; unitPrice?: string }>;
  note?: string;
  reference?: string;
  soldAt?: Date;
}) {
  if (input.type === "debit" && !input.customerId) {
    throw new Error("Customer is required for debit sales");
  }

  return await db.transaction(async (tx) => {
    let totalRevenue = "0.00";
    let totalCost = "0.00";
    let totalProfit = "0.00";

    // Lock customer if debit
    if (input.type === "debit" && input.customerId) {
      const [cust] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .for("update");
      if (!cust) throw new Error("Customer not found");
    }

    const [sale] = await tx
      .insert(sales)
      .values({
        type: input.type,
        customerId: input.customerId || null,
        reference: input.reference || null,
        note: input.note || null,
        totalRevenue: "0.00",
        totalCost: "0.00",
        totalProfit: "0.00",
        soldAt: input.soldAt || new Date(),
      })
      .returning();

    for (const item of input.items) {
      if (item.quantity <= 0) throw new Error("Quantity must be positive");

      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .for("update");

      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.quantity}`
        );
      }

      const unitPrice = toMoney(item.unitPrice ?? product.sellingPrice);
      const unitCost = toMoney(product.avgCost); // COGS at current avg cost
      const revenue = moneyMul(unitPrice, item.quantity);
      const cost = moneyMul(unitCost, item.quantity);
      const profit = moneySub(revenue, cost);

      totalRevenue = moneyAdd(totalRevenue, revenue);
      totalCost = moneyAdd(totalCost, cost);
      totalProfit = moneyAdd(totalProfit, profit);

      // Reduce stock
      await tx
        .update(products)
        .set({
          quantity: product.quantity - item.quantity,
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));

      await tx.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        revenue,
        cost,
        profit,
      });
    }

    await tx
      .update(sales)
      .set({ totalRevenue, totalCost, totalProfit })
      .where(eq(sales.id, sale.id));

    // If debit → increase customer outstanding balance
    if (input.type === "debit" && input.customerId) {
      await tx
        .update(customers)
        .set({
          outstandingBalance: sql`${customers.outstandingBalance} + ${totalRevenue}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, input.customerId));
    }

    return {
      saleId: sale.id,
      totalRevenue,
      totalCost,
      totalProfit,
      type: input.type,
    };
  });
}

/**
 * Record a customer payment (debt settlement)
 */
export async function recordPayment(input: {
  customerId: number;
  amount: string;
  note?: string;
  paidAt?: Date;
}) {
  const amount = toMoney(input.amount);
  if (parseMoney(amount) <= 0) throw new Error("Payment amount must be positive");

  return await db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .for("update");

    if (!customer) throw new Error("Customer not found");

    const current = parseMoney(customer.outstandingBalance);
    const pay = parseMoney(amount);

    if (pay > current + 0.001) {
      // Allow tiny floating tolerance, otherwise reject overpayment by default
      throw new Error(
        `Payment (${amount}) exceeds outstanding balance (${customer.outstandingBalance})`
      );
    }

    const [payment] = await tx
      .insert(payments)
      .values({
        customerId: input.customerId,
        amount,
        note: input.note || null,
        paidAt: input.paidAt || new Date(),
      })
      .returning();

    await tx
      .update(customers)
      .set({
        outstandingBalance: moneySub(customer.outstandingBalance, amount),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, input.customerId));

    return {
      paymentId: payment.id,
      amount,
      newBalance: moneySub(customer.outstandingBalance, amount),
    };
  });
}


/**
 * Give cash and/or items to a customer as Nasiya (loan / credit).
 * Cash increases debt. Items are recorded as a debit sale (stock reduced).
 */
export async function recordLoan(input: {
  customerId: number;
  cashAmount?: string;
  note?: string;
  items?: Array<{ productId: number; quantity: number; unitPrice?: string }>;
}) {
  const cash = toMoney(input.cashAmount || "0");
  const hasCash = parseMoney(cash) > 0;
  const hasItems = (input.items?.length || 0) > 0;
  if (!hasCash && !hasItems) {
    throw new Error("Provide cash amount and/or items for the loan");
  }

  const results: any = { customerId: input.customerId };
  let totalAdded = "0.00";

  if (hasCash) {
    await db.transaction(async (tx) => {
      const [customer] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .for("update");
      if (!customer) throw new Error("Customer not found");

      const [sale] = await tx
        .insert(sales)
        .values({
          type: "debit",
          customerId: input.customerId,
          totalRevenue: cash,
          totalCost: "0.00",
          totalProfit: "0.00",
          note: input.note ? `Cash loan: ${input.note}` : "Cash loan",
          soldAt: new Date(),
        })
        .returning();

      await tx
        .update(customers)
        .set({
          outstandingBalance: sql`${customers.outstandingBalance} + ${cash}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, input.customerId));

      results.cashSaleId = sale.id;
      results.cashAmount = cash;
    });
    totalAdded = moneyAdd(totalAdded, cash);
  }

  if (hasItems) {
    const itemResult = await recordSale({
      type: "debit",
      customerId: input.customerId,
      items: input.items!,
      note: input.note ? `Item loan: ${input.note}` : "Item loan",
    });
    totalAdded = moneyAdd(totalAdded, itemResult.totalRevenue);
    results.itemSale = itemResult;
  }

  const [updated] = await db
    .select({ outstandingBalance: customers.outstandingBalance })
    .from(customers)
    .where(eq(customers.id, input.customerId));

  results.totalAdded = totalAdded;
  results.newBalance = updated?.outstandingBalance ?? "0";
  return results;
}
