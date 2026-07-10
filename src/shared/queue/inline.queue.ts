import type { Queue } from "./types.js";
import { logger } from "../utils/logger.js";

export class InlineQueue implements Queue {
  private handlers = new Map<string, (payload: unknown) => Promise<void>>();
  private inflight = new Set<Promise<void>>();

  process(name: string, handler: (payload: unknown) => Promise<void>): void {
    this.handlers.set(name, handler);
  }

  async enqueue(name: string, payload: unknown): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      logger.warn({ name }, "InlineQueue: no handler registered for job");
      return;
    }
    const p = new Promise<void>((resolve) => {
      setImmediate(async () => {
        try {
          await handler(payload);
        } catch (err) {
          logger.error({ err, name }, "InlineQueue: job handler failed");
        } finally {
          resolve();
        }
      });
    });
    this.inflight.add(p);
    void p.finally(() => this.inflight.delete(p));
  }

  async drain(): Promise<void> {
    await Promise.all([...this.inflight]);
  }
}
