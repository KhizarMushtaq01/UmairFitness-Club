// Ensure DATABASE_URL is populated regardless of what process imports this
// module. Next.js auto-loads .env before user code runs, but standalone
// scripts (e.g. `tsx prisma/seed.ts`) do not go through that bootstrap.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 no longer reads the datasource URL from the schema/env at
// runtime — a driver adapter must be constructed and passed explicitly.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
