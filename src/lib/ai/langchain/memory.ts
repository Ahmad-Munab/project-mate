/**
 * Advanced LangChain Memory System
 * This file implements a sophisticated memory system with shared memory between agents
 */

import { BufferMemory, ChatMessageHistory, MotorheadMemory } from "langchain/memory";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, desc, and, like } from "drizzle-orm";
import { LLMCache } from "./cache";

/**
 * Message type for the AI system
 */
export type AIMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
};

/**
 * Convert our AIMessage type to LangChain message types
 * @param messages - The messages to convert
 * @returns The converted messages
 */
function convertToLangChainMessages(messages: AIMessage[]) {
  return messages.map((message) => {
    if (message.role === "user") {
      return new HumanMessage(message.content);
    } else if (message.role === "assistant") {
      return new AIMessage(message.content);
    } else {
      return new SystemMessage(message.content);
    }
  });
}

/**
 * Create a memory system for a project
 * @param projectId - The ID of the project
 * @returns A LangChain memory system
 */
export async function createProjectMemory(projectId: string) {
  try {
    // Get recent messages from the database
    const recentMessages = await getRecentMessages(projectId, 20);

    // Convert to LangChain message format
    const langChainMessages = convertToLangChainMessages(recentMessages);

    // Create a message history from the messages
    const messageHistory = new ChatMessageHistory(langChainMessages);

    // Create a buffer memory with the message history
    const memory = new BufferMemory({
      chatHistory: messageHistory,
      returnMessages: true,
      memoryKey: "chat_history",
      inputKey: "input",
    });

    return memory;
  } catch (error) {
    console.error("Failed to create project memory:", error);
    throw error;
  }
}

/**
 * Store a message in the database
 * @param projectId - The ID of the project
 * @param message - The message to store
 * @param taskId - Optional task ID
 * @returns True if the message was stored successfully
 */
export async function storeMessage(
  projectId: string,
  message: AIMessage,
  taskId?: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Insert the message into the database
    await db.insert(messages).values({
      project_id: projectId,
      task_id: taskId,
      role: message.role,
      content: message.content,
      created_by: user?.id,
      created_at: message.timestamp || new Date(),
    });

    return true;
  } catch (error) {
    console.error("Failed to store message:", error);
    return false;
  }
}

/**
 * Get recent messages for a project
 * @param projectId - The ID of the project
 * @param limit - The maximum number of messages to return
 * @returns The recent messages
 */
export async function getRecentMessages(
  projectId: string,
  limit: number = 10
): Promise<AIMessage[]> {
  try {
    // Get recent messages from the database
    const dbMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.project_id, projectId))
      .orderBy(desc(messages.created_at))
      .limit(limit);

    // Convert to AIMessage format
    const aiMessages: AIMessage[] = dbMessages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      timestamp: msg.created_at,
    }));

    // Return in chronological order
    return aiMessages.reverse();
  } catch (error) {
    console.error("Failed to get recent messages:", error);
    return [];
  }
}

/**
 * Store a message in both the database and vector store
 * @param projectId - The ID of the project
 * @param message - The message to store
 * @param taskId - Optional task ID
 * @returns True if the message was stored successfully
 */
export async function storeEnhancedMessage(
  projectId: string,
  message: AIMessage,
  taskId?: string
) {
  try {
    // Store in the database
    await storeMessage(projectId, message, taskId);

    // Store in the vector store (only for assistant and user messages)
    if (message.role !== "system") {
      await storeDocument(
        projectId,
        message.content,
        {
          role: message.role,
          source: message.role === "user" ? "user_message" : "assistant_message",
        },
        taskId
      );
    }

    return true;
  } catch (error) {
    console.error("Failed to store enhanced message:", error);
    return false;
  }
}

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
    return [];
  }
}

/**
 * Search for relevant documents in the vector store
 * @param projectId - The ID of the project
 * @param query - The query to search for
 * @param limit - The maximum number of documents to return
 * @returns The retrieved documents
 */
export async function searchRelevantDocuments(
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
    console.error("Failed to search relevant documents:", error);
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
    const documents = await searchRelevantDocuments(projectId, query, 10);

    if (documents.length === 0) {
      return "";
    }

    // Format documents
    const formattedDocuments = documents.map((doc, i) => {
      const source = doc.metadata.source || "unknown";
      const role = doc.metadata.role || "unknown";
      const date = new Date(doc.metadata.created_at || Date.now()).toLocaleString();

      return `[${i + 1}] ${source} (${role}, ${date}): ${doc.pageContent}`;
    }).join("\n\n");

    return formattedDocuments;
  } catch (error) {
    console.error("Failed to get project context:", error);
    return "";
  }
}
