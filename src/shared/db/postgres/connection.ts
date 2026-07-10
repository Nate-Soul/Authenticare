import { PrismaClient } from "@prisma/client";
import { logger } from "../../utils/logger.js";

export const prisma = new PrismaClient();

export async function connectPostgres(): Promise<void> {
  await prisma.$connect();
  logger.info("PostgreSQL connected (Prisma)");
}

export async function disconnectPostgres(): Promise<void> {
  await prisma.$disconnect();
}
