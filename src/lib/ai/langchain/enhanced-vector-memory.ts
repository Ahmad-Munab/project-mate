/**
 * Enhanced Vector Memory System
 * This file implements an advanced memory system using Supabase Vector Store
 * for efficient data storage, better context retrieval, and true agent-like memory
 */

import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { AIMessage as LangChainAIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { FakeEmbeddings } from "@langchain/core/utils/testing";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { aiSuggestions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ChatGroq } from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

/**
 * Message type for the AI system
 */
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Memory segment types for different kinds of information
 */
export enum MemorySegmentType {
  CONVERSATION = "conversation",
  PROJECT_INFO = "project_info",
  TASK_INFO = "task_info",
  USER_PREFERENCES = "user_preferences",
  TECHNICAL_KNOWLEDGE = "technical_knowledge",
  DECISION_HISTORY = "decision_history",
  CODE_CONTEXT = "code_context",
}

/**
 * Enhanced Vector Memory System
 * Uses Supabase Vector Store for efficient storage and retrieval
 */
export class EnhancedVectorMemory {
  private projectId: string;
  private vectorStore: SupabaseVectorStore | null = null;
  private embeddings: FakeEmbeddings;
  private messageHistory: ChatMessageHistory;
  private supabase: any;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.messageHistory = new ChatMessageHistory();

    // Create fake embeddings model (no API key needed)
    this.embeddings = new FakeEmbeddings();
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Supabase client
      this.supabase = await createClient();

      // Initialize vector store
      this.vectorStore = await this.createVectorStore();

      // Load recent messages into memory
      await this.loadRecentMessages();
    } catch (error) {
      console.error("Failed to initialize enhanced vector memory:", error);
      throw error;
    }
  }

  /**
   * Create a vector store for the project
   * @returns A SupabaseVectorStore instance
   */
  private async createVectorStore(): Promise<SupabaseVectorStore> {
    try {
      // Create vector store
      const vectorStore = new SupabaseVectorStore(this.embeddings, {
        client: this.supabase,
        tableName: "documents",
        queryName: "match_documents",
        filter: {
          project_id: this.projectId,
        },
      });

      return vectorStore;
    } catch (error) {
      console.error("Failed to create vector store:", error);
      throw error;
    }
  }

  /**
   * Load recent messages into memory
   */
  private async loadRecentMessages(): Promise<void> {
    try {
      // Get recent messages from the database
      const recentMessages = await getRecentMessages(this.projectId, 20);

      // Add messages to the message history
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
      console.error("Failed to load recent messages:", error);
    }
  }

  /**
   * Store a message in memory
   * @param message - The message to store
   * @param segmentType - The type of memory segment
   * @param taskId - Optional task ID
   */
  async storeMessage(
    message: AIMessage,
    segmentType: MemorySegmentType = MemorySegmentType.CONVERSATION,
    taskId?: string
  ): Promise<void> {
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
      await storeMessage(this.projectId, message, taskId);

      // Store in vector store with segment type
      if (message.role !== "system") {
        await this.storeInVectorStore(
          message.content,
          {
            role: message.role,
            segment_type: segmentType,
            source: message.role === "user" ? "user_message" : "assistant_message",
            ...message.metadata || {},
          },
          taskId
        );
      }
    } catch (error) {
      console.error("Failed to store message in memory:", error);
    }
  }

  /**
   * Store information in the vector store
   * @param content - The content to store
   * @param metadata - Additional metadata
   * @param taskId - Optional task ID
   */
  async storeInVectorStore(
    content: string,
    metadata: Record<string, unknown> = {},
    taskId?: string
  ): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        this.vectorStore = await this.createVectorStore();
      }

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
            project_id: this.projectId,
            task_id: taskId || null,
            created_at: new Date().toISOString(),
          },
        })
      );

      // Add documents to vector store
      await this.vectorStore.addDocuments(documents);

      return documents;
    } catch (error) {
      console.error("Failed to store in vector store:", error);
      return [];
    }
  }

  /**
   * Search for relevant information in memory
   * @param query - The query to search for
   * @param segmentTypes - The types of memory segments to search in
   * @param limit - The maximum number of documents to return
   * @returns The retrieved documents
   */
  async searchMemory(
    query: string,
    segmentTypes: MemorySegmentType[] = [MemorySegmentType.CONVERSATION],
    limit: number = 10
  ): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        this.vectorStore = await this.createVectorStore();
      }

      // Create filter for segment types
      const segmentTypeFilter = segmentTypes.length > 0
        ? { segment_type: { $in: segmentTypes } }
        : {};

      // Search for documents
      const results = await this.vectorStore.similaritySearch(
        query,
        limit,
        {
          project_id: this.projectId,
          ...segmentTypeFilter,
        }
      );

      return results;
    } catch (error) {
      console.error("Failed to search memory:", error);
      return [];
    }
  }

  /**
   * Get context for a query
   * @param query - The query to get context for
   * @param segmentTypes - The types of memory segments to include
   * @returns Formatted context string
   */
  async getContext(
    query: string,
    segmentTypes: MemorySegmentType[] = [
      MemorySegmentType.CONVERSATION,
      MemorySegmentType.PROJECT_INFO,
      MemorySegmentType.TASK_INFO
    ],
    limit: number = 25 // Increased from 15 to 25 for more context
  ): Promise<string> {
    try {
      // Search for relevant documents
      const documents = await this.searchMemory(query, segmentTypes, limit);

      if (documents.length === 0) {
        return "";
      }

      // Group documents by segment type
      const groupedDocuments: Record<string, Document[]> = {};

      for (const doc of documents) {
        const segmentType = doc.metadata.segment_type as string || MemorySegmentType.CONVERSATION;
        if (!groupedDocuments[segmentType]) {
          groupedDocuments[segmentType] = [];
        }
        groupedDocuments[segmentType].push(doc);
      }

      // Format each group
      const formattedGroups: string[] = [];

      // Process PROJECT_INFO first to ensure it appears at the top
      const segmentOrder = [
        MemorySegmentType.PROJECT_INFO,
        MemorySegmentType.TASK_INFO,
        MemorySegmentType.CONVERSATION,
        MemorySegmentType.DECISION_HISTORY,
        MemorySegmentType.CODE_CONTEXT,
      ];

      // Sort the groups by the defined order
      for (const segmentType of segmentOrder) {
        if (groupedDocuments[segmentType]) {
          const docs = groupedDocuments[segmentType];
          const contextType = docs[0]?.metadata?.context_type as string || "";

          const formattedDocs = docs.map((doc, i) => {
            const source = doc.metadata.source as string || "unknown";
            const role = doc.metadata.role as string || "unknown";
            const date = new Date(doc.metadata.created_at as string || Date.now()).toLocaleString();

            return `[${i + 1}] ${source} (${role}, ${date}): ${doc.pageContent}`;
          }).join("\n\n");

          formattedGroups.push(`--- ${segmentType.toUpperCase()}${contextType ? ` (${contextType})` : ""} ---\n${formattedDocs}`);

          // Remove the processed group
          delete groupedDocuments[segmentType];
        }
      }

      // Process any remaining groups
      for (const [segmentType, docs] of Object.entries(groupedDocuments)) {
        const contextType = docs[0]?.metadata?.context_type as string || "";

        const formattedDocs = docs.map((doc, i) => {
          const source = doc.metadata.source as string || "unknown";
          const role = doc.metadata.role as string || "unknown";
          const date = new Date(doc.metadata.created_at as string || Date.now()).toLocaleString();

          return `[${i + 1}] ${source} (${role}, ${date}): ${doc.pageContent}`;
        }).join("\n\n");

        formattedGroups.push(`--- ${segmentType.toUpperCase()}${contextType ? ` (${contextType})` : ""} ---\n${formattedDocs}`);
      }

      return formattedGroups.join("\n\n");
    } catch (error) {
      console.error("Failed to get context:", error);
      return "";
    }
  }

  /**
   * Summarize memory for a specific topic
   * @param topic - The topic to summarize
   * @param segmentTypes - The types of memory segments to include
   * @returns A summary of the memory
   */
  async summarizeMemory(
    topic: string,
    segmentTypes: MemorySegmentType[] = [MemorySegmentType.CONVERSATION]
  ): Promise<string> {
    try {
      // Get relevant documents
      const documents = await this.searchMemory(topic, segmentTypes, 20);

      if (documents.length === 0) {
        return "No relevant information found.";
      }

      // Combine document content
      const combinedContent = documents.map(doc => doc.pageContent).join("\n\n");

      // Create a model for summarization
      const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY!,
        model: "llama3-70b-8192",
        temperature: 0.3, // Lower temperature for more factual summaries
      });

      // Create a prompt template
      const promptTemplate = PromptTemplate.fromTemplate(`
You are a memory summarization system. Your task is to create a concise, accurate summary of the following information about the topic: "${topic}".

Information to summarize:
${combinedContent}

Create a summary that captures the key points, decisions, and context. Be factual and precise.
      `);

      // Create a chain
      const chain = RunnableSequence.from([
        promptTemplate,
        model,
        new StringOutputParser(),
      ]);

      // Run the chain
      const summary = await chain.invoke({});

      return summary;
    } catch (error) {
      console.error("Failed to summarize memory:", error);
      return "Failed to generate summary.";
    }
  }

  /**
   * Store project information in memory
   * @param info - The project information
   */
  async storeProjectInfo(info: Record<string, unknown>): Promise<void> {
    try {
      // Convert to string
      const infoString = JSON.stringify(info, null, 2);

      // Store in vector store
      await this.storeInVectorStore(
        infoString,
        {
          segment_type: MemorySegmentType.PROJECT_INFO,
          source: "project_info",
        }
      );
    } catch (error) {
      console.error("Failed to store project info:", error);
    }
  }

  /**
   * Store task information in memory
   * @param taskInfo - The task information
   * @param taskId - The ID of the task
   */
  async storeTaskInfo(taskInfo: Record<string, unknown>, taskId: string): Promise<void> {
    try {
      // Convert to string
      const infoString = JSON.stringify(taskInfo, null, 2);

      // Store in vector store
      await this.storeInVectorStore(
        infoString,
        {
          segment_type: MemorySegmentType.TASK_INFO,
          source: "task_info",
          task_id: taskId,
        },
        taskId
      );
    } catch (error) {
      console.error("Failed to store task info:", error);
    }
  }

  /**
   * Store a decision in memory
   * @param decision - The decision that was made
   * @param reasoning - The reasoning behind the decision
   * @param context - The context in which the decision was made
   */
  async storeDecision(
    decision: string,
    reasoning: string,
    context: string
  ): Promise<void> {
    try {
      // Format the decision
      const decisionString = `
Decision: ${decision}

Reasoning: ${reasoning}

Context: ${context}
      `.trim();

      // Store in vector store
      await this.storeInVectorStore(
        decisionString,
        {
          segment_type: MemorySegmentType.DECISION_HISTORY,
          source: "decision",
        }
      );
    } catch (error) {
      console.error("Failed to store decision:", error);
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
}

/**
 * Create an enhanced vector memory system
 * @param projectId - The ID of the project
 * @returns An enhanced vector memory system
 */
export async function createEnhancedMemory(projectId: string): Promise<EnhancedVectorMemory> {
  const memory = new EnhancedVectorMemory(projectId);
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

    // Insert the message into the database as an AI suggestion
    await db.insert(aiSuggestions).values({
      projectId: projectId,
      taskId: taskId,
      type: message.role === 'user' ? 'user_message' : 'ai_message',
      content: message.content,
      createdAt: message.timestamp || new Date(),
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
    // Get recent messages from the database using aiSuggestions
    const aiSuggestionsResult = await db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.projectId, projectId))
      .orderBy(desc(aiSuggestions.createdAt))
      .limit(limit);

    // Convert to AIMessage format
    const aiMessages: AIMessage[] = aiSuggestionsResult.map((msg) => ({
      role: msg.type === 'user_message' ? 'user' : 'assistant' as "user" | "assistant" | "system",
      content: msg.content,
      timestamp: msg.createdAt,
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
): Promise<boolean> {
  try {
    // Create memory system
    const memory = await createEnhancedMemory(projectId);

    // Store the message
    await memory.storeMessage(
      message,
      MemorySegmentType.CONVERSATION,
      taskId
    );

    return true;
  } catch (error) {
    console.error("Failed to store enhanced message:", error);
    return false;
  }
}

/**
 * Get project context from memory
 * @param projectId - The ID of the project
 * @param query - The query to search for
 * @returns The project context
 */
export async function getProjectContext(
  projectId: string,
  query: string
): Promise<string> {
  try {
    // Import the comprehensive project context function
    const { getComprehensiveProjectContext } = await import('./project-context');

    // Use the comprehensive project context
    return await getComprehensiveProjectContext(projectId, query);
  } catch (error) {
    console.error("Failed to get project context:", error);

    // Fallback to basic context if comprehensive context fails
    try {
      // Create memory system
      const memory = await createEnhancedMemory(projectId);

      // Get context
      return await memory.getContext(query, [
        MemorySegmentType.CONVERSATION,
        MemorySegmentType.PROJECT_INFO,
        MemorySegmentType.TASK_INFO,
        MemorySegmentType.DECISION_HISTORY,
        MemorySegmentType.CODE_CONTEXT,
      ], 30); // Increase limit to 30 documents
    } catch (fallbackError) {
      console.error("Failed to get fallback project context:", fallbackError);
      return "";
    }
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
