/**
 * Agent Factory
 * This file contains functions for creating specialized agents
 */

import { ChatGroq } from "@langchain/groq";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { SystemMessage } from "@langchain/core/messages";
import { getEnhancedProjectContext } from "../../memory/enhanced";
import { getProjectInfo, getProjectTools } from "../../tools";
import { getEnhancedMultiAgentPrompt } from "../../prompts/enhanced-prompts";
import { AgentType } from "../types";
import { LLMCache } from "../../tools/utils";

// Cache for LLM responses to reduce API calls
const llmCache = new LLMCache();

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
 * @returns An agent executor
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

    // Create the model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama3-70b-8192",
      temperature: 0.7,
      maxTokens: 1000,
      cache: llmCache,
    });

    // Create the agent
    try {
      const agent = createOpenAIFunctionsAgent({
        llm: model,
        tools,
        systemMessage,
      });

      // Create the agent executor
      return AgentExecutor.fromAgentAndTools({
        agent,
        tools,
        verbose: true,
        maxIterations: 5,
      });
    } catch (agentError) {
      console.error(`Error creating ${agentType} agent with createOpenAIFunctionsAgent:`, agentError);

      // Fallback to a simpler approach if the agent creation fails
      console.log(`Using fallback agent creation method for ${agentType} agent`);

      // Create a simple executor that just uses the model directly
      return AgentExecutor.fromAgentAndTools({
        agent: {
          invoke: async ({ input }) => {
            const result = await model.invoke(input);
            return { output: result.content };
          }
        } as any,
        tools,
        verbose: true,
      });
    }
  } catch (error) {
    console.error(`Failed to create ${agentType} agent:`, error);
    throw new Error(`Failed to create ${agentType} agent: ${error}`);
  }
}
