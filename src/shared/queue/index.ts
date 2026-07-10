import { env } from "../../config/env.js";
import type { Queue } from "./types.js";
import { InlineQueue } from "./inline.queue.js";

let queue: Queue;
if (env.QUEUE_DRIVER === "bullmq") {
  const { BullMqQueue } = await import("./bullmq.queue.js");
  queue = new BullMqQueue();
} else {
  queue = new InlineQueue();
}
export { queue };
export type { Queue } from "./types.js";
