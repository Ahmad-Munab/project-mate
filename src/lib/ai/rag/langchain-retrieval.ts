/**
 * LangChain RAG implementation
 * This file implements a proper LangChain RAG system
 */

import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@/utils/supabase/server";
import { Document } from "@langchain/core/documents";

/**
 * Create a vector store for a project
 * @param projectId - The ID of the project
 * @returns A SupabaseVectorStore instance
 */
export async function createVectorStore(projectId: string) {
  try {
    const supabase = await createClient();
    
    // Create embeddings model
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "text-embedding-3-small",
    });
    
    // Create vector store
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: "documents",
      queryName: "match_documents",
      filter: {
        project_id: projectId,
      },
    });
    
    return vectorStore;
  } catch (error) {
    console.error("Failed to create vector store:", error);
    throw error;
  }
}

/**
 * Store a document in the vector store
 * @param projectId - The ID of the project
 * @param content - The content of the document
 * @param metadata - Additional metadata for the document
 * @param taskId - Optional task ID
 * @returns The stored document
 */
export async function storeDocument(
  projectId: string,
  content: string,
  metadata: Record<string, any> = {},
  taskId?: string
) {
  try {
    // Create vector store
    const vectorStore = await createVectorStore(projectId);
    
    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const chunks = await textSplitter.splitText(content);
    
    // Create documents
    const documents = chunks.map(
      chunk => new Document({
        pageContent: chunk,
        metadata: {
          ...metadata,
          project_id: projectId,
          task_id: taskId || null,
          created_at: new Date().toISOString(),
        },
      })
    );
    
    // Add documents to vector store
    await vectorStore.addDocuments(documents);
    
    return documents;
  } catch (error) {
    console.error("Failed to store document:", error);
    throw error;
  }
}

/**
 * Retrieve relevant documents from the vector store
 * @param projectId - The ID of the project
 * @param query - The query to search for
 * @param limit - The maximum number of documents to return
 * @returns The retrieved documents
 */
export async function retrieveDocuments(
  projectId: string,
  query: string,
  limit: number = 5
) {
  try {
    // Create vector store
    const vectorStore = await createVectorStore(projectId);
    
    // Search for documents
    const results = await vectorStore.similaritySearch(query, limit, {
      project_id: projectId,
    });
    
    return results;
  } catch (error) {
    console.error("Failed to retrieve documents:", error);
    return [];
  }
}

/**
 * Get project context from the vector store
 * @param projectId - The ID of the project
 * @param query - The query to search for
 * @returns The project context
 */
export async function getProjectContext(
  projectId: string,
  query: string
) {
  try {
    // Retrieve documents
    const documents = await retrieveDocuments(projectId, query, 10);
    
    // Format documents
    const formattedDocuments = documents.map((doc, i) => {
      const source = doc.metadata.source || "unknown";
      const role = doc.metadata.role || "unknown";
      
      return `[${i + 1}] ${source} (${role}): ${doc.pageContent}`;
    }).join("\n\n");
    
    return formattedDocuments;
  } catch (error) {
    console.error("Failed to get project context:", error);
    return "";
  }
}
