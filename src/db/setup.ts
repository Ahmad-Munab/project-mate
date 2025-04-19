import { enablePgvector } from "./pgvector";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Setup the database
 * This script enables the pgvector extension and pushes the schema
 */
async function setup() {
  try {
    console.log("Setting up database...");
    
    // Enable pgvector extension
    console.log("Enabling pgvector extension...");
    await enablePgvector();
    
    // Push schema
    console.log("Pushing schema...");
    
    // Create the ai_embeddings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) NOT NULL,
        task_id UUID REFERENCES tasks(id),
        content TEXT NOT NULL,
        embedding TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    
    console.log("Database setup complete!");
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setup().then(() => process.exit(0));
}

export { setup };
