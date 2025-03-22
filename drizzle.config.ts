import { defineConfig } from "drizzle-kit";

const isDevelop = process.env.DRIZZLE_ENV === "develop";

const dbUrl = isDevelop
  ? process.env.DEVELOP_DATABASE_URL
  : process.env.DATABASE_URL;

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl!,
  },
});
