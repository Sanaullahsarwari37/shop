import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";

import { productRoutes } from "./routes/products.js";
import { categoryRoutes } from "./routes/categories.js";
import { salesRoutes } from "./routes/sales.js";
import { purchaseRoutes } from "./routes/purchases.js";
import { customerRoutes } from "./routes/customers.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { reportRoutes } from "./routes/reports.js";

const app = Fastify({
  logger: true,
});

// Allow empty body with application/json (e.g. DELETE with no body)
app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  function (req, body, done) {
    try {
      const json = body === "" || body == null ? {} : JSON.parse(body as string);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  }
);

await app.register(cors, {
  origin: true, // local only
});

// Health
app.get("/api/health", async () => ({ status: "ok", time: new Date().toISOString() }));

// Register routes
await app.register(productRoutes);
await app.register(categoryRoutes);
await app.register(salesRoutes);
await app.register(purchaseRoutes);
await app.register(customerRoutes);
await app.register(dashboardRoutes);
await app.register(reportRoutes);

const port = Number(process.env.PORT) || 3001;
const host = "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`🚀 Shop Management API running at http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
