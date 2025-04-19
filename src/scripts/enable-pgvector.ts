/**
 * Script to enable the pgvector extension
 * Run this script with: npx tsx src/scripts/enable-pgvector.ts
 */

import { enablePgvectorExtension, createIvfIndex } from "@/db/migrations/enable-pgvector";

async function main() {
  console.log("Enabling pgvector extension...");
  
  // Enable the pgvector extension
  const extensionEnabled = await enablePgvectorExtension();
  
  if (!extensionEnabled) {
    console.error("Failed to enable pgvector extension. Exiting.");
    process.exit(1);
  }
  
  console.log("Successfully enabled pgvector extension.");
  
  // Create the IVF index
  console.log("Creating IVF index for faster similarity search...");
  const indexCreated = await createIvfIndex();
  
  if (!indexCreated) {
    console.error("Failed to create IVF index. You may need to run this again after inserting data.");
    process.exit(1);
  }
  
  console.log("Successfully created IVF index.");
  console.log("pgvector setup complete!");
  
  process.exit(0);
}

main().catch((error) => {
  console.error("Error running pgvector setup:", error);
  process.exit(1);
});
