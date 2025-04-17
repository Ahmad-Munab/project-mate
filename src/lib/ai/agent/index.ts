/**
 * AI Agent System
 * This file implements a direct approach using Groq with LangChain
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";
import { getAgentTools } from "./tools";
import { getEnhancedProjectContext, storeEnhancedMessage } from "../memory/enhanced";
import { getProjectInfo } from "../langchain/tools";

// Export tools
export { getAgentTools } from './tools';

/**
 * Configuration for the Groq model
 */
const modelConfig = {
  model: "llama3-70b-8192",
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Create a direct agent for a project
 * @param projectId - The ID of the project
 * @returns A function that can process user messages
 */
export async function createAgent(projectId: string) {
  try {
    // Get project context
    const projectContext = await getEnhancedProjectContext(projectId, "");

    // Get project info
    const projectInfo = await getProjectInfo(projectId);

    // Get project tools
    const tools = getAgentTools(projectId);

    // Log the tools to ensure they're being loaded
    console.log(`Loaded ${tools.length} tools for the agent`);

    // Create the model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
    });

    // Create the system message
    const systemMessage = new SystemMessage(`
You are Mate, an intelligent AI assistant for project management.
You help users manage their projects by creating and organizing tasks, providing insights, and taking actions.

Project: ${projectInfo.project.name}
Description: ${projectInfo.project.description || "No description provided"}

Project stats:
- ${projectInfo.tasks?.length || 0} tasks
- ${projectInfo.members?.length || 0} members

${projectContext ? `Relevant context from project history:\n${projectContext}\n\n` : ""}

Project Tasks:
${projectInfo.tasks && projectInfo.tasks.length > 0 ?
  projectInfo.tasks.map(task => `- ${task.title || 'Untitled'} (Status: ${task.status || 'Unknown'}, Priority: ${task.priority || 'Medium'})`).join('\n') :
  "No tasks yet"}

Available tools:
${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Be proactive, helpful, and focused on delivering value to the user.
    `.trim());

    // Return a function that can process user messages
    return {
      processMessage: async (userMessage: string) => {
        try {
          // Use the model directly
          const response = await model.invoke([
            systemMessage,
            { role: "user", content: userMessage }
          ]);

          return response.content;
        } catch (error) {
          console.error("Error processing message:", error);
          return "I'm sorry, I encountered an error while processing your message. Please try again.";
        }
      }
    };
  } catch (error) {
    console.error("Failed to create agent:", error);
    throw error;
  }
}

/**
 * Run the agent with a user message
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The agent's response
 */
export async function runAgent(projectId: string, userMessage: string) {
  try {
    // Create the agent
    const agent = await createAgent(projectId);

    // Store the user message
    await storeEnhancedMessage(
      projectId,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }
    );

    // Process the message
    const response = await agent.processMessage(userMessage);

    // Store the assistant message
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }
    );

    return response;
  } catch (error) {
    console.error("Failed to run agent:", error);

    // Store the error message
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
    );

    // Return a fallback response
    return "I'm sorry, I encountered an error while processing your message. Please try again.";
  }
}
