import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { AIMessage as LangChainAIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getRecentMessages, storeMessage, type AIMessage } from "./memory";
import { getProjectContext, storeDocumentInStore } from "./vector-store";
import { getProjectInfo } from "./tools";

// Convert our AIMessage type to LangChain message types
function convertToLangChainMessages(messages: AIMessage[]) {
  return messages.map((message) => {
    if (message.role === "user") {
      return new HumanMessage(message.content);
    } else if (message.role === "assistant") {
      return new LangChainAIMessage(message.content);
    } else {
      return new SystemMessage(message.content);
    }
  });
}

// Create a memory system for a project
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

// Store a message in both the database and vector store
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
      await storeDocumentInStore(
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

    // Get relevant context from the vector store
    const vectorContext = await getProjectContext(projectId, query);

    // Create a system message with the combined context
    const systemMessage = `
You are an AI project assistant named "Mate" for the project "${projectInfo.project.name}".

Project description: ${projectInfo.project.description || "No description provided"}

Project stats:
- ${projectInfo.tasks.length} tasks
- ${projectInfo.members.length} members

${vectorContext ? `Relevant context from project history:\n${vectorContext}` : ""}

Project Tasks:
${projectInfo.tasks.map(task => `- ${task.title} (Status: ${task.status}, Priority: ${task.priority})`).join('\n')}

You can perform actions on the Kanban board, including:
1. Creating new tasks
2. Updating existing tasks
3. Moving tasks between columns
4. Creating new columns
5. Updating column settings
6. Assigning due dates to tasks
7. Setting task priorities

You should be very specific to this project and provide detailed, technical advice. Focus on implementation details, code architecture, and technical solutions. Be helpful, concise, and focus on technical aspects of the project.
    `.trim();

    return systemMessage;
  } catch (error) {
    console.error("Failed to get enhanced project context:", error);
    return "";
  }
}
