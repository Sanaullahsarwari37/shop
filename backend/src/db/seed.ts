import { db } from "./index.js";
import { categories, products, customers, settings } from "./schema.js";

async function seed() {
  console.log("Seeding...");

  // Settings
  await db
    .insert(settings)
    .values([
      { key: "currency", value: "AFN" },
      { key: "currency_symbol", value: "؋" },
      { key: "shop_name", value: "My Local Shop" },
    ])
    .onConflictDoNothing();

  // Categories
  const cats = await db
    .insert(categories)
    .values([
      { name: "Drinks", perPrice: "40.00" },
      { name: "Food", perPrice: "20.00" },
      { name: "Cosmetics", perPrice: "50.00" },
      { name: "Stationery", perPrice: "10.00" },
      { name: "Electronics", perPrice: "100.00" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log("Categories:", cats.length);

  // Sample products
  if (cats.length) {
    await db.insert(products).values([
      {
        name: "Coca Cola 1.5L",
        categoryId: cats[0]?.id,
        purchasePrice: "40.00",
        sellingPrice: "55.00",
        avgCost: "40.00",
        quantity: 50,
        minStock: 10,
        sku: "DRK-001",
      },
      {
        name: "Bread Loaf",
        categoryId: cats[1]?.id,
        purchasePrice: "20.00",
        sellingPrice: "30.00",
        avgCost: "20.00",
        quantity: 30,
        minStock: 8,
        sku: "FD-001",
      },
      {
        name: "Shampoo 400ml",
        categoryId: cats[2]?.id,
        purchasePrice: "120.00",
        sellingPrice: "180.00",
        avgCost: "120.00",
        quantity: 15,
        minStock: 5,
        sku: "COS-001",
      },
      {
        name: "Notebook A4",
        categoryId: cats[3]?.id,
        purchasePrice: "35.00",
        sellingPrice: "50.00",
        avgCost: "35.00",
        quantity: 40,
        minStock: 10,
        sku: "ST-001",
      },
      {
        name: "USB Cable",
        categoryId: cats[4]?.id,
        purchasePrice: "80.00",
        sellingPrice: "120.00",
        avgCost: "80.00",
        quantity: 25,
        minStock: 5,
        sku: "EL-001",
      },
    ]);
  }

  // Sample customers
  await db.insert(customers).values([
    { name: "Ahmad", phone: "0700123456", outstandingBalance: "0.00" },
    { name: "Mahmood", phone: "0700987654", outstandingBalance: "0.00" },
    { name: "Farid", phone: "0780111222", outstandingBalance: "0.00" },
  ]);

  console.log("Seed complete");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
