import type { SqliteDatabase } from "./database.js";

declare module "fastify" {
  interface FastifyInstance {
    database: SqliteDatabase;
  }
}
