import { createClient } from "@/utils/supabase/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { Document } from "@langchain/core/documents";
import { Groq } from "groq-sdk";

// Simple in-memory document store since we're not using vector embeddings
let documentStore: Document[] = [];

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

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

// Function to search for relevant documents
export async function searchRelevantDocuments(
  projectId: string,
  query: string,
  limit: number = 5
) {
  try {
    // Filter documents by project ID
    const projectDocuments = documentStore.filter(
      (doc) => doc.metadata.projectId === projectId
    );

    // Sort by timestamp (most recent first)
    const sortedDocuments = projectDocuments.sort((a, b) => {
      const timeA = new Date(a.metadata.timestamp).getTime();
      const timeB = new Date(b.metadata.timestamp).getTime();
      return timeB - timeA;
    });

    // Return the most recent documents
    return sortedDocuments.slice(0, limit);
  } catch (error) {
    console.error("Failed to search relevant documents:", error);
    return [];
  }
}

// Function to get project context from document store
export async function getProjectContext(projectId: string, query: string) {
  try {
    const documents = await searchRelevantDocuments(projectId, query);

    if (documents.length === 0) {
      return "";
    }

    // Combine the documents into a single context string
    const context = documents
      .map((doc) => `${doc.pageContent}\n(Source: ${doc.metadata.source || "Unknown"}, Date: ${new Date(doc.metadata.timestamp).toLocaleString()})`)
      .join("\n\n");

    return context;
  } catch (error) {
    console.error("Failed to get project context:", error);
    return "";
  }
}
