import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Enable pgvector extension in the database
 * This should be run before pushing the schema
 */
export async function enablePgvector() {
  try {
    // Enable the pgvector extension
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("Successfully enabled pgvector extension");
    return true;
  } catch (error) {
    console.error("Failed to enable pgvector extension:", error);
    return false;
  }
}
