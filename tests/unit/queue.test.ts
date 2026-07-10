import { describe, it, expect, vi } from "vitest";
import { InlineQueue } from "../../src/shared/queue/inline.queue.js";

describe("InlineQueue", () => {
  it("runs a registered handler after enqueue and drain resolves after it finishes", async () => {
    const q = new InlineQueue();
    const handler = vi.fn().mockResolvedValue(undefined);
    q.process("job-a", handler);
    await q.enqueue("job-a", { x: 1 });
    await q.drain();
    expect(handler).toHaveBeenCalledWith({ x: 1 });
  });

  it("a throwing handler is logged, not propagated, and drain still resolves", async () => {
    const q = new InlineQueue();
    q.process("job-b", async () => {
      throw new Error("boom");
    });
    await q.enqueue("job-b", {});
    await expect(q.drain()).resolves.toBeUndefined();
  });
});
