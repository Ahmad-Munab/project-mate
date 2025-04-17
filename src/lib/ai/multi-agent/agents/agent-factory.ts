/**
 * Agent Factory
 * This file contains functions for creating specialized agents
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";
import { getEnhancedProjectContext } from "../../memory/enhanced";
import { getProjectInfo, getProjectTools } from "../../tools";
import { getEnhancedMultiAgentPrompt } from "../../prompts/enhanced-prompts";
import { AgentType } from "../types";

/**
 * Create a system message for a specialized agent
 * @param projectId - The ID of the project
 * @param query - The user's query
 * @param agentType - The type of agent to create
 * @returns A system message for the agent
 */
export async function createSystemMessage(
  projectId: string,
  query: string,
  agentType: AgentType = AgentType.CONVERSATIONAL
) {
  try {
    // Get project info and context
    const projectInfo = await getProjectInfo(projectId);
    const projectContext = await getEnhancedProjectContext(projectId, query);

    // Use the enhanced multi-agent prompt
    const systemPrompt = getEnhancedMultiAgentPrompt(
      projectInfo,
      agentType.toString().toLowerCase(),
      projectContext
    );

    // Create the system message
    return new SystemMessage(systemPrompt);
  } catch (error) {
    console.error(`Failed to create system message for ${agentType} agent:`, error);

    // Return a default system message if there's an error
    return new SystemMessage(`You are Mate, an AI assistant for project management. You are the ${agentType} agent.`);
  }
}

/**
 * Create a specialized agent
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @param agentType - The type of agent to create
 * @returns A direct response from the model
 */
export async function createSpecializedAgent(
  projectId: string,
  userMessage: string,
  agentType: AgentType = AgentType.CONVERSATIONAL
) {
  try {
    // Create the system message
    const systemMessage = await createSystemMessage(projectId, userMessage, agentType);

    // Get the tools for the agent
    const tools = await getProjectTools(projectId);
    console.log(`Loaded ${tools.length} tools for the ${agentType} agent`);

    // Create the model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama3-70b-8192",
      temperature: 0.7,
      maxTokens: 1000,
    });

    // Use the model directly instead of trying to create an agent
    const response = await model.invoke([
      systemMessage,
      { role: "user", content: userMessage }
    ]);

    return {
      output: response.content,
      tools: tools.map(tool => tool.name)
    };
  } catch (error) {
    console.error(`Failed to create ${agentType} agent:`, error);
    return {
      output: `I'm sorry, I encountered an error while processing your request. Please try again.`,
      error: String(error)
    };
  }
}
