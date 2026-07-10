import { env } from "../../config/env.js";
import type { UserRepository } from "../types/user.js";

/**
 * Swappable data layer.
 *
 * To commit to one database for a real project:
 *  1. Delete the driver folder you don't need (mongo/ or postgres/).
 *  2. Delete the corresponding branch below and the unused import.
 *  3. Remove the unused dependency (mongoose or @prisma/client + prisma) from package.json.
 *  4. Drop DB_DRIVER from config/env.ts (it becomes a hardcoded choice, not a runtime option).
 */

let userRepository: UserRepository;
let connect: () => Promise<void>;
let disconnect: () => Promise<void>;

if (env.DB_DRIVER === "mongo") {
  const { MongoUserRepository } = await import("./mongo/user.repository.js");
  const { connectMongo, disconnectMongo } = await import("./mongo/connection.js");
  userRepository = new MongoUserRepository();
  connect = connectMongo;
  disconnect = disconnectMongo;
} else {
  const { PostgresUserRepository } = await import("./postgres/user.repository.js");
  const { connectPostgres, disconnectPostgres } = await import("./postgres/connection.js");
  userRepository = new PostgresUserRepository();
  connect = connectPostgres;
  disconnect = disconnectPostgres;
}

export { userRepository, connect as connectDatabase, disconnect as disconnectDatabase };
