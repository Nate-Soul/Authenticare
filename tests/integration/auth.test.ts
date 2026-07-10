import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

// Contract-level tests for the auth email endpoints. verify-email/reset-password are
// rejected at the validation boundary (no DB access), and forgot-password/resend are
// fire-and-forget always-200 endpoints — so the whole suite runs without live infra.
describe("auth email endpoints (contract)", () => {
  const app = createApp();

  it("verify-email rejects a missing token with 400 VALIDATION_ERROR", async () => {
    const res = await request(app).post("/api/v1/auth/verify-email").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("forgot-password always returns 200 regardless of email existence", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "ghost@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("resend-verification always returns 200 regardless of email existence", async () => {
    const res = await request(app).post("/api/v1/auth/resend-verification").send({ email: "ghost@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("reset-password rejects a weak password with 400", async () => {
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token: "x", password: "weak" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
