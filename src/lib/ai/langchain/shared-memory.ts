/**
 * Advanced Shared Memory System
 * This file implements a sophisticated shared memory system for multi-agent coordination
 */

import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { AIMessage as LangChainAIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { messages as dbMessages } from "@/db/schema";
import { eq, desc, and, like } from "drizzle-orm";
import { LLMCache } from "./cache";

/**
 * Message type for the AI system
 */
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

/**
 * Shared memory for multi-agent coordination
 */
export class SharedAgentMemory {
  private projectId: string;
  private cache: LLMCache;
  private messageHistory: ChatMessageHistory;
  
  constructor(projectId: string) {
    this.projectId = projectId;
    this.cache = new LLMCache();
    this.messageHistory = new ChatMessageHistory();
  }
  
  /**
   * Initialize the memory with recent messages
   */
  async initialize(): Promise<void> {
    try {
      // Get recent messages
      const recentMessages = await getRecentMessages(this.projectId, 20);
      
      // Convert to LangChain message format and add to history
      for (const message of recentMessages) {
        if (message.role === "user") {
          await this.messageHistory.addUserMessage(message.content);
        } else if (message.role === "assistant") {
          await this.messageHistory.addAIMessage(message.content);
        } else if (message.role === "system") {
          await this.messageHistory.addMessage(new SystemMessage(message.content));
        }
      }
    } catch (error) {
      console.error("Failed to initialize shared memory:", error);
    }
  }
  
  /**
   * Add a message to the shared memory
   * @param message - The message to add
   */
  async addMessage(message: AIMessage): Promise<void> {
    try {
      // Add to message history
      if (message.role === "user") {
        await this.messageHistory.addUserMessage(message.content);
      } else if (message.role === "assistant") {
        await this.messageHistory.addAIMessage(message.content);
      } else if (message.role === "system") {
        await this.messageHistory.addMessage(new SystemMessage(message.content));
      }
      
      // Store in database
      await storeEnhancedMessage(this.projectId, message);
    } catch (error) {
      console.error("Failed to add message to shared memory:", error);
    }
  }
  
  /**
   * Get the message history
   * @returns The message history
   */
  getMessageHistory(): ChatMessageHistory {
    return this.messageHistory;
  }
  
  /**
   * Create a buffer memory for an agent
   * @returns A buffer memory
   */
  createBufferMemory(): BufferMemory {
    return new BufferMemory({
      chatHistory: this.messageHistory,
      returnMessages: true,
      memoryKey: "chat_history",
      inputKey: "input",
    });
  }
  
  /**
   * Store a value in the cache
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds
   */
  cacheValue(key: string, value: unknown, ttl: number): void {
    this.cache.set(key, value, ttl);
  }
  
  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  getCachedValue(key: string): unknown {
    return this.cache.get(key);
  }
  
  /**
   * Check if a key exists in the cache
   * @param key - The cache key
   * @returns Whether the key exists
   */
  hasCachedValue(key: string): boolean {
    return this.cache.get(key) !== null;
  }
}

/**
 * Create a shared memory for a project
 * @param projectId - The ID of the project
 * @returns A shared memory
 */
export async function createSharedMemory(projectId: string): Promise<SharedAgentMemory> {
  const memory = new SharedAgentMemory(projectId);
  await memory.initialize();
  return memory;
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
): Promise<boolean> {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Insert the message into the database
    await db.insert(dbMessages).values({
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
    const dbMessagesResult = await db
      .select()
      .from(dbMessages)
      .where(eq(dbMessages.project_id, projectId))
      .orderBy(desc(dbMessages.created_at))
      .limit(limit);

    // Convert to AIMessage format
    const aiMessages: AIMessage[] = dbMessagesResult.map((msg) => ({
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
 * Create a vector store for a project
 * @param projectId - The ID of the project
 * @returns A SupabaseVectorStore instance
 */
export async function createVectorStore(projectId: string): Promise<SupabaseVectorStore> {
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
  metadata: Record<string, unknown> = {},
  taskId?: string
): Promise<Document[]> {
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
): Promise<boolean> {
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
): Promise<Document[]> {
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
): Promise<string> {
  try {
    // Retrieve documents
    const documents = await searchRelevantDocuments(projectId, query, 10);
    
    if (documents.length === 0) {
      return "";
    }
    
    // Format documents
    const formattedDocuments = documents.map((doc, i) => {
      const source = doc.metadata.source as string || "unknown";
      const role = doc.metadata.role as string || "unknown";
      const date = new Date(doc.metadata.created_at as string || Date.now()).toLocaleString();
      
      return `[${i + 1}] ${source} (${role}, ${date}): ${doc.pageContent}`;
    }).join("\n\n");
    
    return formattedDocuments;
  } catch (error) {
    console.error("Failed to get project context:", error);
    return "";
  }
}

/**
 * Get project information
 * @param projectId - The ID of the project
 * @returns Project information
 */
export async function getProjectInfo(projectId: string) {
  try {
    // Import here to avoid circular dependencies
    const { getProjectInfo: getInfo } = await import("./tools");
    return getInfo(projectId);
  } catch (error) {
    console.error("Failed to get project info:", error);
    throw error;
  }
}
