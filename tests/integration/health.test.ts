import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("GET /api/v1/health", () => {
  it("returns 200 and an ok status", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });
});

describe("GET /api/v1/unknown-route", () => {
  it("returns a structured 404", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/unknown-route");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("Auth validation", () => {
  it("rejects registration with a weak password before touching the database", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/auth/register").send({
      firstName: "A",
      lastName: "B",
      email: "test@example.com",
      password: "weak",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
