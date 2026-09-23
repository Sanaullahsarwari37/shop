import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ===================== CATEGORIES =====================
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    /** Default purchase cost per piece for items in this category */
    perPrice: numeric("per_price", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("categories_name_idx").on(t.name)]
);

// ===================== PRODUCTS =====================
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    sku: varchar("sku", { length: 50 }),
    barcode: varchar("barcode", { length: 50 }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "restrict" }),
    purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
    avgCost: numeric("avg_cost", { precision: 12, scale: 2 }).notNull().default("0"), // weighted average
    quantity: integer("quantity").notNull().default(0),
    minStock: integer("min_stock").notNull().default(5),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("products_name_idx").on(t.name),
    index("products_sku_idx").on(t.sku),
    index("products_barcode_idx").on(t.barcode),
    index("products_category_idx").on(t.categoryId),
    index("products_quantity_idx").on(t.quantity),
  ]
);

// ===================== CUSTOMERS (Debit) =====================
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    address: text("address"),
    note: text("note"),
    // Cached balance for performance – always kept in sync via transactions
    outstandingBalance: numeric("outstanding_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("customers_name_idx").on(t.name),
    index("customers_phone_idx").on(t.phone),
    index("customers_balance_idx").on(t.outstandingBalance),
  ]
);

// ===================== PURCHASES =====================
export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 50 }),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull().default("0"),
    note: text("note"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("purchases_date_idx").on(t.purchasedAt)]
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: serial("id").primaryKey(),
    purchaseId: integer("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    index("purchase_items_purchase_idx").on(t.purchaseId),
    index("purchase_items_product_idx").on(t.productId),
  ]
);

// ===================== SALES =====================
export const sales = pgTable(
  "sales",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 50 }),
    // 'cash' | 'debit'
    type: varchar("type", { length: 10 }).notNull().default("cash"),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "restrict" }),
    totalRevenue: numeric("total_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull().default("0"), // COGS
    totalProfit: numeric("total_profit", { precision: 12, scale: 2 }).notNull().default("0"),
    note: text("note"),
    soldAt: timestamp("sold_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("sales_date_idx").on(t.soldAt),
    index("sales_type_idx").on(t.type),
    index("sales_customer_idx").on(t.customerId),
  ]
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(), // selling price at time of sale
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(), // avg cost at time of sale
    revenue: numeric("revenue", { precision: 12, scale: 2 }).notNull(),
    cost: numeric("cost", { precision: 12, scale: 2 }).notNull(),
    profit: numeric("profit", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    index("sale_items_sale_idx").on(t.saleId),
    index("sale_items_product_idx").on(t.productId),
  ]
);

// ===================== PAYMENTS (Debit settlement) =====================
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    note: text("note"),
    paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("payments_customer_idx").on(t.customerId),
    index("payments_date_idx").on(t.paidAt),
  ]
);

// ===================== SETTINGS =====================
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ===================== RELATIONS =====================
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  purchaseItems: many(purchaseItems),
  saleItems: many(saleItems),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  payments: many(payments),
}));

export const purchasesRelations = relations(purchases, ({ many }) => ({
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
}));
