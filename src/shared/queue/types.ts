export interface Queue {
  enqueue(name: string, payload: unknown): Promise<void>;
  process(name: string, handler: (payload: unknown) => Promise<void>): void;
  /** Awaits all in-flight handlers. Used in tests; no-op for external brokers. */
  drain(): Promise<void>;
}
