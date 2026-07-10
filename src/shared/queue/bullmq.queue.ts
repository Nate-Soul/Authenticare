import type { Queue as QueueInterface } from "./types.js";
import { env } from "../../config/env.js";
import { logger } from "../utils/logger.js";

export class BullMqQueue implements QueueInterface {
  private queues = new Map<string, import("bullmq").Queue>();
  private connection: { url: string };

  constructor() {
    this.connection = { url: env.REDIS_URL as string };
  }

  process(name: string, handler: (payload: unknown) => Promise<void>): void {
    void import("bullmq").then(({ Worker }) => {
      new Worker(name, async (job) => handler(job.data), { connection: this.connection }).on("failed", (job, err) =>
        logger.error({ err, name, jobId: job?.id }, "BullMQ job failed"),
      );
    });
  }

  async enqueue(name: string, payload: unknown): Promise<void> {
    const { Queue } = await import("bullmq");
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    await q.add(name, payload, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    });
  }

  async drain(): Promise<void> {
    /* no-op: external broker */
  }
}
