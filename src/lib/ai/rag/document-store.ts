/**
 * Document store for RAG system
 */

import { Document } from "@langchain/core/documents";

// Simple in-memory document store since we're not using vector embeddings
let documentStore: Document[] = [];

// Function to get the document store
export function getDocumentStore() {
  return documentStore;
}

// Function to store a document in the document store
export async function storeDocumentInStore(
  projectId: string,
  content: string,
  metadata: Record<string, any> = {},
  taskId?: string
) {
  try {
    // Create a document with metadata
    const document = new Document({
      pageContent: content,
      metadata: {
        ...metadata,
        projectId,
        taskId,
        timestamp: new Date().toISOString(),
      },
    });

    // Add the document to the document store
    documentStore.push(document);

    // Limit the size of the document store to prevent memory issues
    if (documentStore.length > 100) {
      documentStore = documentStore.slice(-100);
    }

    return true;
  } catch (error) {
    console.error("Failed to store document:", error);
    return false;
  }
}
