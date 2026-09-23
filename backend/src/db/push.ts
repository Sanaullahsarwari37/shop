import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function push() {
  console.log("Creating tables...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      sku VARCHAR(50),
      barcode VARCHAR(50),
      category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
      purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      avg_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS products_name_idx ON products(name);
    CREATE INDEX IF NOT EXISTS products_sku_idx ON products(sku);
    CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
    CREATE INDEX IF NOT EXISTS products_quantity_idx ON products(quantity);

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(30),
      address TEXT,
      note TEXT,
      outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name);
    CREATE INDEX IF NOT EXISTS customers_balance_idx ON customers(outstanding_balance);

    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      reference VARCHAR(50),
      total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
      note TEXT,
      purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS purchases_date_idx ON purchases(purchased_at);

    CREATE TABLE IF NOT EXISTS purchase_items (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL,
      unit_cost NUMERIC(12,2) NOT NULL,
      total_cost NUMERIC(12,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      reference VARCHAR(50),
      type VARCHAR(10) NOT NULL DEFAULT 'cash',
      customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
      total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
      note TEXT,
      sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sales_date_idx ON sales(sold_at);
    CREATE INDEX IF NOT EXISTS sales_type_idx ON sales(type);
    CREATE INDEX IF NOT EXISTS sales_customer_idx ON sales(customer_id);

    CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(12,2) NOT NULL,
      unit_cost NUMERIC(12,2) NOT NULL,
      revenue NUMERIC(12,2) NOT NULL,
      cost NUMERIC(12,2) NOT NULL,
      profit NUMERIC(12,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      amount NUMERIC(12,2) NOT NULL,
      note TEXT,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS payments_customer_idx ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS payments_date_idx ON payments(paid_at);

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Tables created successfully");
  process.exit(0);
}

push().catch((e) => {
  console.error(e);
  process.exit(1);
});
