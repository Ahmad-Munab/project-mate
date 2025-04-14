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
    const { messages } = await import("@/db/schema");

    await db.insert(messages).values({
      project_id: projectId,
      role: message.role,
      content: message.content,
      created_at: message.timestamp,
      task_id: taskId || null,
    });

    return true;
  } catch (error) {
    console.error("Failed to store enhanced message:", error);
    return false;
  }
}

// Get project context for a query
export async function getEnhancedProjectContext(projectId: string): Promise<string> {
  try {
    // Get project information
    const projectInfo = await getProjectInfo(projectId);

    if (!projectInfo || !projectInfo.project) {
      console.error("Failed to get project info");
      return "You are an AI project assistant named 'Mate'. I couldn't retrieve the project information.";
    }

    // Get task statuses (columns)
    const taskStatuses = await getTaskStatuses(projectId) || [];
    const columnNames = taskStatuses.map(status => status.name || 'Unnamed');

    // Get recent messages from the database
    const { db } = await import("@/db");
    const { messages } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");

    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.project_id, projectId),
      orderBy: [desc(messages.created_at)],
      limit: 10,
    });

    // Create a system message with the combined context
    const systemMessage = `
You are an AI project assistant named "Mate" for the project "${projectInfo.project.name}".

Project description: ${projectInfo.project.description || "No description provided"}

Project stats:
- ${projectInfo.tasks?.length || 0} tasks
- ${projectInfo.members?.length || 0} members
- ${taskStatuses.length} columns: ${columnNames.join(', ')}

Recent conversation:
${recentMessages.length > 0 ? recentMessages.reverse().map(msg => `${msg.role}: ${msg.content}`).join('\n') : "No recent conversation"}

Project Tasks:
${projectInfo.tasks && projectInfo.tasks.length > 0 ?
  projectInfo.tasks.map(task => `- ${task.title || 'Untitled'} (Status: ${task.status || 'Unknown'}, Priority: ${task.priority || 'Medium'})`).join('\n') :
  "No tasks yet"}

You can perform actions on the Kanban board, including creating tasks, updating tasks, moving tasks, creating columns, etc.
    `.trim();

    return systemMessage;
  } catch (error) {
    console.error("Failed to get enhanced project context:", error);
    return "";
  }
}
