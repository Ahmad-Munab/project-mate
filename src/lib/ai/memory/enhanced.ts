/**
 * Enhanced memory system combining buffer memory and document store
 * Uses LangChain for memory management and RAG
 */

import { storeMessage } from "./storage";
import { AIMessage } from "./types";
import { storeDocument, getProjectContext } from "../rag/langchain-retrieval";
import { getProjectInfo, getTaskStatuses } from "../tools";

// Store a message in both the database and document store
export async function storeEnhancedMessage(
  projectId: string,
  message: AIMessage,
  taskId?: string
) {
  try {
    // Store in the database
    await storeMessage(projectId, message, taskId);

    // Store in the document store (only for assistant and user messages)
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

// Get project context for a query
export async function getEnhancedProjectContext(projectId: string, query: string) {
  try {
    // Get project information
    const projectInfo = await getProjectInfo(projectId);

    // Get task statuses (columns)
    const taskStatuses = await getTaskStatuses(projectId);
    const columnNames = taskStatuses.map(status => status.name);

    // Get relevant context from the document store
    const vectorContext = await getProjectContext(projectId, query);

    // Create a system message with the combined context
    const systemMessage = `
You are an AI project assistant named "Mate" for the project "${projectInfo.project.name}".

Project description: ${projectInfo.project.description || "No description provided"}

Project stats:
- ${projectInfo.tasks.length} tasks
- ${projectInfo.members.length} members
- ${taskStatuses.length} columns: ${columnNames.join(', ')}

${vectorContext ? `Relevant context from project history:\n${vectorContext}` : ""}

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
