import { describe, it, expect } from "vitest";
import { resolveRequestId } from "../../src/shared/middleware/requestId.js";

describe("resolveRequestId", () => {
  it("reuses a well-formed inbound request id", () => {
    expect(resolveRequestId("client-trace-123")).toBe("client-trace-123");
  });

  it("generates a fresh id when none is supplied", () => {
    const id = resolveRequestId(undefined);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates a fresh id when the inbound value contains unsafe characters", () => {
    const id = resolveRequestId("bad id\r\nX-Injected: evil");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates a fresh id when the inbound value exceeds the length limit", () => {
    const id = resolveRequestId("a".repeat(129));
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates a fresh id when the inbound value is an empty string", () => {
    const id = resolveRequestId("");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates a fresh id when the inbound header is an array (repeated header)", () => {
    const id = resolveRequestId(["one", "two"]);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
