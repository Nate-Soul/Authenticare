import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { AppError } from "../../src/shared/utils/AppError.js";

vi.mock("../../src/shared/utils/logger.js", () => ({
  logger: { error: vi.fn() },
}));

const { errorHandler } = await import("../../src/shared/middleware/errorHandler.js");
const { logger } = await import("../../src/shared/utils/logger.js");

function fakeRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("errorHandler request-id correlation", () => {
  beforeEach(() => {
    vi.mocked(logger.error).mockClear();
  });

  it("includes the request id on the structured log line for a 5xx AppError", () => {
    const req = { id: "req-abc-123" } as unknown as Request;
    const res = fakeRes();

    errorHandler(AppError.internal("boom"), req, res, vi.fn());

    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ reqId: "req-abc-123" }), expect.any(String));
  });

  it("includes the request id on the structured log line for an unhandled error", () => {
    const req = { id: "req-def-456" } as unknown as Request;
    const res = fakeRes();

    errorHandler(new Error("unexpected"), req, res, vi.fn());

    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ reqId: "req-def-456" }), expect.any(String));
  });
});
