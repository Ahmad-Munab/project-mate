/**
 * Retrieval functions for RAG system
 */

import { getDocumentStore } from "./document-store";

// Function to search for relevant documents
export async function searchRelevantDocuments(
  projectId: string,
  query: string,
  limit: number = 5
) {
  try {
    // Get the document store
    const documentStore = getDocumentStore();
    
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
