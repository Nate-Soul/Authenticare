import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} from "../../modules/auth/auth.schemas.js";

extendZodWithOpenApi(z);
export const registry = new OpenAPIRegistry();

function jsonBody(schema: z.ZodTypeAny) {
  return { body: { content: { "application/json": { schema } } } };
}
const ok = { 200: { description: "Success" } };

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/register",
  tags: ["auth"],
  request: jsonBody(registerSchema),
  responses: { 201: { description: "Created" } },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/auth/login",
  tags: ["auth"],
  request: jsonBody(loginSchema),
  responses: ok,
});
registry.registerPath({ method: "post", path: "/api/v1/auth/refresh", tags: ["auth"], responses: ok });
registry.registerPath({ method: "post", path: "/api/v1/auth/logout", tags: ["auth"], responses: ok });
registry.registerPath({
  method: "post",
  path: "/api/v1/auth/verify-email",
  tags: ["auth"],
  request: jsonBody(verifyEmailSchema),
  responses: ok,
});
registry.registerPath({
  method: "post",
  path: "/api/v1/auth/resend-verification",
  tags: ["auth"],
  request: jsonBody(resendVerificationSchema),
  responses: ok,
});
registry.registerPath({
  method: "post",
  path: "/api/v1/auth/forgot-password",
  tags: ["auth"],
  request: jsonBody(forgotPasswordSchema),
  responses: ok,
});
registry.registerPath({
  method: "post",
  path: "/api/v1/auth/reset-password",
  tags: ["auth"],
  request: jsonBody(resetPasswordSchema),
  responses: ok,
});

// To document another module: import its Zod schemas here and add registry.registerPath(...)
// entries following the same pattern, then rebuild the doc (buildOpenApiDocument is called
// fresh on every /docs.json request, so no cache invalidation is needed).
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: { title: "ARC Node.js Boilerplate API", version: "1.0.0" },
    servers: [{ url: "/" }],
  });
}
