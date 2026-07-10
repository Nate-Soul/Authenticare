import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("GET /api/v1/docs.json", () => {
  it("serves a valid OpenAPI document listing the auth paths", async () => {
    const res = await request(createApp()).get("/api/v1/docs.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(Object.keys(res.body.paths)).toContain("/api/v1/auth/login");
  });
});
