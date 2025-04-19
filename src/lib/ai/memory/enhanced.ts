/**
 * Enhanced memory system combining buffer memory and document store
 * Uses LangChain for memory management and RAG
 */

import { getProjectInfo } from "../langchain/tools";

/**
 * AI Message interface
 */
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

// Store a message in the database and vector store
export async function storeEnhancedMessage(
  projectId: string,
  message: AIMessage,
  taskId?: string
) {
  try {
    // Store in database
    const { db } = await import("@/db");
    const { messages } = await import("@/db/schema");

    // Check if the messages table exists
    try {
      await db.insert(messages).values({
        project_id: projectId,
        role: message.role,
        content: message.content,
        created_at: message.timestamp,
        task_id: taskId || null,
      });
    } catch (dbError: any) {
      // If the table doesn't exist, log the error but don't fail the operation
      if (dbError.code === '42P01') { // PostgreSQL error code for 'relation does not exist'
        console.warn("Messages table does not exist. Skipping message storage.");
      } else {
        console.error("Error storing message in database:", dbError);
      }
    }

    // Store in simple memory
    try {
      const { createSimpleMemory } = await import("../langchain/simple-memory");
      const memory = await createSimpleMemory(projectId);
      await memory.initialize();
      await memory.storeMessage(message, taskId);
    } catch (memoryError) {
      console.error("Error storing message in memory:", memoryError);
    }

    return true;
  } catch (error) {
    console.error("Failed to store enhanced message:", error);
    return false;
  }
}

// Get project context for a query
export async function getEnhancedProjectContext(projectId: string, query: string = "What is the current state of the project?"): Promise<string> {
  try {
    // Use the simple memory to get context
    const { createSimpleMemory } = await import("../langchain/simple-memory");
    const memory = await createSimpleMemory(projectId);
    await memory.initialize();

    // Get context from the memory
    const memoryContext = await memory.getContext(query);

    if (memoryContext) {
      return memoryContext;
    }

    // Fallback to basic context if vector memory fails
    const projectInfo = await getProjectInfo(projectId);

    if (!projectInfo || !projectInfo.project) {
      console.error("Failed to get project info");
      return "You are an AI project assistant named 'Mate'. I couldn't retrieve the project information.";
    }

    // No need to get task statuses for basic context

    // Create a basic system message with minimal context
    const systemMessage = `
You are an AI project assistant named "Mate" for the project "${projectInfo.project.name}".

Project description: ${projectInfo.project.description || "No description provided"}

You can perform actions on the Kanban board, including creating tasks, updating tasks, moving tasks, creating columns, etc.
    `.trim();

    return systemMessage;
  } catch (error) {
    console.error("Failed to get enhanced project context:", error);
    return "";
  }
}
