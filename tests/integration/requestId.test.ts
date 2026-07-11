import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("request id tracing", () => {
  it("echoes back a well-formed inbound X-Request-Id header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health").set("X-Request-Id", "test-trace-42");
    expect(res.headers["x-request-id"]).toBe("test-trace-42");
  });

  it("generates a fresh X-Request-Id header when none is supplied", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("does not reflect an unsafe inbound X-Request-Id header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health").set("X-Request-Id", "bad;id");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
