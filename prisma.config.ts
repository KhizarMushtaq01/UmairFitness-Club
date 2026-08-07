// Prisma 7 requires connection URLs to live in prisma.config.ts rather than
// inline in schema.prisma (the datasource `url` field is no longer supported
// there). This file supplies DATABASE_URL to the Prisma CLI (generate, db push).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
