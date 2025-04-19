/**
 * Simple Memory System
 * This file implements a simple memory system for the AI assistant
 * that stores and retrieves messages from the database without using embeddings
 */

import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { AIMessage as LangChainAIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
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
 * Simple Memory System
 * Stores and retrieves messages from the database
 */
export class SimpleMemory {
  private projectId: string;
  private messageHistory: ChatMessageHistory;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.messageHistory = new ChatMessageHistory();
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<void> {
    try {
      // Load recent messages into memory
      await this.loadRecentMessages();
    } catch (error) {
      console.error("Failed to initialize simple memory:", error);
      throw error;
    }
  }

  /**
   * Load recent messages into memory
   */
  private async loadRecentMessages(): Promise<void> {
    try {
      // Get recent messages from the database
      const recentMessages = await getRecentMessages(this.projectId, 30);

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
   * @param taskId - Optional task ID
   */
  async storeMessage(
    message: AIMessage,
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
    } catch (error) {
      console.error("Failed to store message in memory:", error);
    }
  }

  /**
   * Get context for a query
   * @param query - The query to get context for (not used in this implementation)
   * @returns Formatted context string
   */
  async getContext(query: string): Promise<string> {
    try {
      // Get recent messages
      const recentMessages = await getRecentMessages(this.projectId, 30);
      
      if (recentMessages.length === 0) {
        return "";
      }

      // Format messages
      const formattedMessages = recentMessages.map((message, i) => {
        const role = message.role;
        const date = new Date(message.timestamp || Date.now()).toLocaleString();
        return `[${i + 1}] ${role} (${date}): ${message.content}`;
      }).join("\n\n");

      return `--- CONVERSATION HISTORY ---\n${formattedMessages}`;
    } catch (error) {
      console.error("Failed to get context:", error);
      return "";
    }
  }

  /**
   * Summarize memory for a specific topic
   * @param topic - The topic to summarize
   * @returns A summary of the memory
   */
  async summarizeMemory(topic: string): Promise<string> {
    try {
      // Get recent messages
      const recentMessages = await getRecentMessages(this.projectId, 30);
      
      if (recentMessages.length === 0) {
        return "No conversation history found.";
      }

      // Format messages
      const formattedMessages = recentMessages.map(message => {
        return `${message.role}: ${message.content}`;
      }).join("\n\n");

      // Create a model for summarization
      const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY!,
        model: "llama3-70b-8192",
        temperature: 0.3, // Lower temperature for more factual summaries
      });

      // Create a prompt template
      const promptTemplate = PromptTemplate.fromTemplate(`
You are a memory summarization system. Your task is to create a concise, accurate summary of the following conversation about the topic: "${topic}".

Conversation history:
${formattedMessages}

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
 * Create a simple memory system
 * @param projectId - The ID of the project
 * @returns A simple memory system
 */
export async function createSimpleMemory(projectId: string): Promise<SimpleMemory> {
  const memory = new SimpleMemory(projectId);
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
 * Store a message in the database
 * @param projectId - The ID of the project
 * @param message - The message to store
 * @param taskId - Optional task ID
 * @returns True if the message was stored successfully
 */
export async function storeSimpleMessage(
  projectId: string,
  message: AIMessage,
  taskId?: string
): Promise<boolean> {
  try {
    // Create memory system
    const memory = await createSimpleMemory(projectId);

    // Store the message
    await memory.storeMessage(message, taskId);

    return true;
  } catch (error) {
    console.error("Failed to store simple message:", error);
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
    // Create memory system
    const memory = await createSimpleMemory(projectId);

    // Get context
    return await memory.getContext(query);
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
