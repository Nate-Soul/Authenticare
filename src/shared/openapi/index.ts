import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiDocument } from "./registry.js";

export function mountDocs(app: Express): void {
  const doc = buildOpenApiDocument();
  app.get("/api/v1/docs.json", (_req, res) => res.json(doc));
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(doc));
}
