import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, ilike, desc, sql, and, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { customers, sales, payments, saleItems, products } from "../db/schema.js";
import { recordPayment, recordLoan } from "../services/inventory.js";
import { toMoney } from "../utils/money.js";

const customerSchema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function customerRoutes(app: FastifyInstance) {
  // List customers
  app.get("/api/customers", async (req) => {
    const q = req.query as any;
    const search = q.search || "";
    const outstandingOnly = q.outstanding === "true";

    let query = db.select().from(customers).$dynamic();
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${customers.name} ILIKE ${"%" + search + "%"} OR ${customers.phone} ILIKE ${"%" + search + "%"})`
      );
    }
    if (outstandingOnly) {
      conditions.push(gt(customers.outstandingBalance, "0"));
    }
    if (conditions.length) query = query.where(and(...conditions));
    return await query.orderBy(desc(customers.outstandingBalance));
  });

  // Create
  app.post("/api/customers", async (req, reply) => {
    const body = customerSchema.parse(req.body);
    const [created] = await db.insert(customers).values(body).returning();
    return reply.status(201).send(created);
  });

  // Get one + full ledger
  app.get("/api/customers/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) return reply.status(404).send({ error: "Customer not found" });

    const debitSales = await db
      .select({
        id: sales.id,
        totalRevenue: sales.totalRevenue,
        totalProfit: sales.totalProfit,
        soldAt: sales.soldAt,
        note: sales.note,
      })
      .from(sales)
      .where(and(eq(sales.customerId, id), eq(sales.type, "debit")))
      .orderBy(desc(sales.soldAt));

    const paymentList = await db
      .select()
      .from(payments)
      .where(eq(payments.customerId, id))
      .orderBy(desc(payments.paidAt));

    const totalDebit = debitSales.reduce(
      (s, r) => s + parseFloat(r.totalRevenue),
      0
    );
    const totalPaid = paymentList.reduce((s, r) => s + parseFloat(r.amount), 0);

    return {
      ...customer,
      totalDebit: totalDebit.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      remaining: customer.outstandingBalance,
      debitSales,
      payments: paymentList,
    };
  });

  // Update
  app.patch("/api/customers/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = customerSchema.partial().parse(req.body);
    const [updated] = await db
      .update(customers)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    if (!updated) return reply.status(404).send({ error: "Not found" });
    return updated;
  });

  // Record payment (cash against Nasiya debt)
  app.post("/api/customers/:id/payments", async (req, reply) => {
    try {
      const id = Number((req.params as any).id);
      const body = z
        .object({
          amount: z.string().or(z.number()),
          note: z.string().optional(),
        })
        .parse(req.body);

      const result = await recordPayment({
        customerId: id,
        amount: toMoney(body.amount),
        note: body.note,
      });
      return reply.status(201).send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });


  // Cash / item loan to debtor (Nasiya)
  app.post("/api/customers/:id/loans", async (req, reply) => {
    try {
      const id = Number((req.params as any).id);
      const body = z
        .object({
          cashAmount: z.string().or(z.number()).optional(),
          note: z.string().optional(),
          items: z
            .array(
              z.object({
                productId: z.number().int().positive(),
                quantity: z.number().int().positive(),
                unitPrice: z.string().or(z.number()).optional(),
              })
            )
            .optional(),
        })
        .parse(req.body);

      const result = await recordLoan({
        customerId: id,
        cashAmount: body.cashAmount != null ? String(body.cashAmount) : undefined,
        note: body.note,
        items: body.items,
      });
      return reply.status(201).send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  // Force delete customer + payments + debit sales history
  app.delete("/api/customers/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) return reply.status(404).send({ error: "Customer not found" });

    try {
      await db.transaction(async (tx) => {
        await tx.delete(payments).where(eq(payments.customerId, id));

        const custSales = await tx
          .select({ id: sales.id })
          .from(sales)
          .where(eq(sales.customerId, id));

        const saleIds = custSales.map((s) => s.id);
        if (saleIds.length) {
          for (const saleId of saleIds) {
            await tx.delete(saleItems).where(eq(saleItems.saleId, saleId));
          }
          await tx.delete(sales).where(eq(sales.customerId, id));
        }

        await tx.delete(customers).where(eq(customers.id, id));
      });
      return { success: true };
    } catch (e: any) {
      return reply.status(400).send({
        error: e.message || "Failed to delete customer",
      });
    }
  });
}
