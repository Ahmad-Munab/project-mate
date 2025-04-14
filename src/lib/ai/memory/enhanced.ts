/**
 * Enhanced memory system combining buffer memory and document store
 * Uses LangChain for memory management and RAG
 */

import { getProjectInfo, getTaskStatuses } from "../langchain/tools";

/**
 * AI Message interface
 */
export interface AIMessage {
  role: string;
  content: string;
  timestamp: Date;
}

// Store a message in the database
export async function storeEnhancedMessage(
  projectId: string,
  message: AIMessage,
  taskId?: string
) {
  try {
    // Store in database
    const { db } = await import("@/db");
    const { aiMessages } = await import("@/db/schema");

    await db.insert(aiMessages).values({
      projectId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      taskId: taskId || null,
    });

    return true;
  } catch (error) {
    console.error("Failed to store enhanced message:", error);
    return false;
  }
}

// Get project context for a query
export async function getEnhancedProjectContext(projectId: string) {
  try {
    // Get project information
    const projectInfo = await getProjectInfo(projectId);

    // Get task statuses (columns)
    const taskStatuses = await getTaskStatuses(projectId);
    const columnNames = taskStatuses.map(status => status.name);

    // Get recent messages from the database
    const { db } = await import("@/db");
    const { aiMessages } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");

    const recentMessages = await db.query.aiMessages.findMany({
      where: eq(aiMessages.projectId, projectId),
      orderBy: [desc(aiMessages.timestamp)],
      limit: 10,
    });

    // Create a system message with the combined context
    const systemMessage = `
You are an AI project assistant named "Mate" for the project "${projectInfo.project.name}".

Project description: ${projectInfo.project.description || "No description provided"}

Project stats:
- ${projectInfo.tasks.length} tasks
- ${projectInfo.members.length} members
- ${taskStatuses.length} columns: ${columnNames.join(', ')}

Recent conversation:
${recentMessages.reverse().map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Project Tasks:
${projectInfo.tasks.map(task => `- ${task.title} (Status: ${task.status}, Priority: ${task.priority})`).join('\n')}

You can perform actions on the Kanban board, including creating tasks, updating tasks, moving tasks, creating columns, etc.
    `.trim();

    return systemMessage;
  } catch (error) {
    console.error("Failed to get enhanced project context:", error);
    return "";
  }
}
