import mongoose from "mongoose";
import { env } from "../../../config/env.js";
import { logger } from "../../utils/logger.js";

export async function connectMongo(): Promise<void> {
  if (!env.MONGO_URI) throw new Error("MONGO_URI is not set");

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  const conn = await mongoose.connect(env.MONGO_URI);
  logger.info(`MongoDB connected @ ${conn.connection.host}`);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
