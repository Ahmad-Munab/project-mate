/**
 * Advanced LangChain Agent System
 * This file implements a highly agentic LangChain agent with multi-agent capabilities
 */

import { ChatGroq } from "@langchain/groq";
import { AgentExecutor, createOpenAIFunctionsAgent, createReactAgent } from "langchain/agents";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { RunnableSequence, RunnableBranch } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { getProjectTools } from "./tools";
import { createProjectMemory, storeEnhancedMessage, getProjectInfo, getProjectContext } from "./memory";
import { detectAction, detectAndExecuteAction, ActionType } from "./action-detector";

/**
 * Configuration for the LangChain agent
 */
const agentConfig = {
  model: "llama3-70b-8192",
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Create a LangChain model
 * @param temperature - The temperature to use for the model
 * @returns A LangChain model
 */
function createModel(temperature: number = agentConfig.temperature) {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: agentConfig.model,
    temperature,
    maxTokens: agentConfig.maxTokens,
  });
}

/**
 * Create a comprehensive system message for the agent
 * @param projectId - The ID of the project
 * @param query - The query to use for context retrieval
 * @returns A system message
 */
async function createSystemMessage(projectId: string, query: string = "") {
  try {
    // Get project information and context in a single operation
    const [projectInfo, vectorContext] = await Promise.all([
      getProjectInfo(projectId),
      getProjectContext(projectId, query)
    ]);

    // Create a system message with the combined context
    const systemMessage = new SystemMessage(`
You are Mate, an advanced AI agent for project management.
You help users manage their projects by creating and organizing tasks, providing insights, and taking actions.

Project: ${projectInfo.project.name}
Description: ${projectInfo.project.description || "No description provided"}

Project stats:
- ${projectInfo.tasks.length} tasks
- ${projectInfo.members.length} members

${vectorContext ? `Relevant context from project history:\n${vectorContext}\n\n` : ""}

Project Tasks:
${projectInfo.tasks.map(task => `- ${task.title} (Status: ${task.status}, Priority: ${task.priority})`).join('\n')}

You have access to tools that allow you to:
- Create, update, and delete tasks
- Create, update, and delete columns (task statuses)
- Move tasks between columns
- Get information about the project and its tasks

Be proactive, helpful, and focused on delivering value to the user.
Use the most appropriate tool for each request.
Think step by step and consider multiple approaches to solving problems.
When appropriate, suggest improvements to the project organization or workflow.
    `.trim());

    return systemMessage;
  } catch (error) {
    console.error("Failed to create system message:", error);
    throw error;
  }
}

/**
 * Create a LangChain agent for a project with enhanced capabilities
 * @param projectId - The ID of the project
 * @param query - The query to use for context retrieval
 * @returns A LangChain agent executor
 */
export async function createProjectAgent(projectId: string, query: string = "") {
  try {
    // Get project memory
    const memory = await createProjectMemory(projectId);

    // Get project tools
    const tools = getProjectTools(projectId);

    // Create the system message
    const systemMessage = await createSystemMessage(projectId, query);

    // Create the model
    const model = createModel();

    // Create the agent
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      systemMessage,
    });

    // Create the executor with enhanced configuration
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      memory,
      verbose: true,
      returnIntermediateSteps: true,
      maxIterations: 10, // Allow more iterations for complex tasks
      earlyStoppingMethod: "generate", // Use more sophisticated stopping method
    });

    return agentExecutor;
  } catch (error) {
    console.error("Failed to create project agent:", error);
    throw error;
  }
}

/**
 * Create a ReAct agent for more complex reasoning
 * @param projectId - The ID of the project
 * @param query - The query to use for context retrieval
 * @returns A LangChain agent executor
 */
export async function createReActAgent(projectId: string, query: string = "") {
  try {
    // Get project memory
    const memory = await createProjectMemory(projectId);

    // Get project tools
    const tools = getProjectTools(projectId);

    // Create the system message
    const systemMessage = await createSystemMessage(projectId, query);

    // Create the model with lower temperature for more precise reasoning
    const model = createModel(0.2);

    // Create the ReAct agent
    const agent = await createReactAgent({
      llm: model,
      tools,
      systemMessage,
    });

    // Create the executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      memory,
      verbose: true,
      returnIntermediateSteps: true,
      maxIterations: 15, // Allow more iterations for complex reasoning
    });

    return agentExecutor;
  } catch (error) {
    console.error("Failed to create ReAct agent:", error);
    throw error;
  }
}

/**
 * Process a user message using an integrated approach that combines action detection and execution
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The agent's response
 */
export async function processUserMessage(projectId: string, userMessage: string) {
  try {
    // Store the user message
    await storeEnhancedMessage(projectId, {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    // First, try the integrated approach to reduce API calls
    const integratedResponse = await detectAndExecuteAction(projectId, userMessage);

    // If the integrated approach produced a meaningful response, use it
    if (integratedResponse && integratedResponse.length > 20 && !integratedResponse.includes("I encountered an error")) {
      // Store the assistant message
      await storeEnhancedMessage(projectId, {
        role: "assistant",
        content: integratedResponse,
        timestamp: new Date(),
      });

      return integratedResponse;
    }

    // If the integrated approach didn't work well, try the action detector
    const detectedAction = await detectAction(projectId, userMessage);

    // If an action was detected with high confidence, execute it directly
    if (detectedAction && detectedAction.confidence > 0.8 && !detectedAction.needsConfirmation) {
      // Execute the action using the appropriate tool
      const actionResponse = await executeDetectedAction(projectId, detectedAction);

      // Store the assistant message
      await storeEnhancedMessage(projectId, {
        role: "assistant",
        content: actionResponse,
        timestamp: new Date(),
      });

      return actionResponse;
    }

    // If we need more complex reasoning, use the appropriate agent
    const isComplexQuery = isComplexRequest(userMessage);
    const agentExecutor = isComplexQuery
      ? await createReActAgent(projectId, userMessage)
      : await createProjectAgent(projectId, userMessage);

    // Run the agent
    const result = await agentExecutor.invoke({
      input: userMessage,
    });

    // Get the response
    const response = result.output;

    // Store the assistant message
    await storeEnhancedMessage(projectId, {
      role: "assistant",
      content: response,
      timestamp: new Date(),
    });

    return response;
  } catch (error) {
    console.error("Error processing message with agent:", error);

    // Fallback to a simple response
    const fallbackResponse = "I'm sorry, I encountered an error while processing your message. Please try again.";

    // Store the fallback response
    await storeEnhancedMessage(projectId, {
      role: "assistant",
      content: fallbackResponse,
      timestamp: new Date(),
    });

    return fallbackResponse;
  }
}

/**
 * Execute a detected action using the appropriate tool
 * @param projectId - The ID of the project
 * @param action - The detected action
 * @returns The result of executing the action
 */
async function executeDetectedAction(projectId: string, action: any): Promise<string> {
  try {
    // Get the tools
    const tools = getProjectTools(projectId);

    // Find the appropriate tool for the action
    let toolName = "";
    switch (action.type) {
      case ActionType.CREATE_TASK:
        toolName = "create_task";
        break;
      case ActionType.UPDATE_TASK:
        toolName = "update_task";
        break;
      case ActionType.DELETE_TASK:
        toolName = "delete_task";
        break;
      case ActionType.CREATE_COLUMN:
        toolName = "create_column";
        break;
      case ActionType.UPDATE_COLUMN:
        toolName = "update_column";
        break;
      case ActionType.DELETE_COLUMN:
        toolName = "delete_column";
        break;
      case ActionType.MOVE_TASK:
        toolName = "move_task";
        break;
      default:
        return "I'm not sure how to execute that action.";
    }

    // Find the tool
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      return "I couldn't find the appropriate tool to execute that action.";
    }

    // Execute the tool
    const result = await tool.invoke(action.parameters);

    // Parse the result
    const parsedResult = JSON.parse(result);

    // Generate a human-readable response
    if (parsedResult.success) {
      switch (action.type) {
        case ActionType.CREATE_TASK:
          return `I've created a new task titled "${action.parameters.title}".`;
        case ActionType.UPDATE_TASK:
          return `I've updated the task as requested.`;
        case ActionType.DELETE_TASK:
          return `I've deleted the task as requested.`;
        case ActionType.CREATE_COLUMN:
          return `I've created a new column named "${action.parameters.name}".`;
        case ActionType.UPDATE_COLUMN:
          return `I've updated the column as requested.`;
        case ActionType.DELETE_COLUMN:
          return `I've deleted the column as requested.`;
        case ActionType.MOVE_TASK:
          return `I've moved the task to the requested column.`;
        default:
          return `I've successfully executed the action.`;
      }
    } else {
      return `I encountered an error while trying to execute the action: ${parsedResult.error}`;
    }
  } catch (error) {
    console.error("Error executing detected action:", error);
    return "I encountered an error while trying to execute the action.";
  }
}

/**
 * Determine if a request is complex and requires more sophisticated reasoning
 * @param userMessage - The user's message
 * @returns Whether the request is complex
 */
function isComplexRequest(userMessage: string): boolean {
  const complexPatterns = [
    /analyze/i,
    /suggest/i,
    /improve/i,
    /roadmap/i,
    /plan/i,
    /strategy/i,
    /optimize/i,
    /restructure/i,
    /reorganize/i,
    /prioritize/i,
    /multiple/i,
    /several/i,
    /complex/i,
    /advanced/i,
    /sophisticated/i,
    /if.*then/i,
    /when.*then/i,
    /\?.*\?/i, // Multiple questions
    /\band\b.*\band\b/i, // Multiple conjunctions
  ];

  return complexPatterns.some(pattern => pattern.test(userMessage));
}

/**
 * Create a simple chain for processing messages without tools
 * @param projectId - The ID of the project
 * @returns A runnable sequence
 */
export async function createSimpleChain(projectId: string) {
  try {
    // Create the system message
    const systemMessage = await createSystemMessage(projectId);

    // Create the model
    const model = createModel();

    // Create the chain
    const chain = RunnableSequence.from([
      {
        system: () => systemMessage,
        human: (input: { input: string }) => new HumanMessage(input.input),
      },
      model,
      new StringOutputParser(),
    ]);

    return chain;
  } catch (error) {
    console.error("Failed to create simple chain:", error);
    throw error;
  }
}

/**
 * Process a simple message using a LangChain chain
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The chain's response
 */
export async function processSimpleMessage(projectId: string, userMessage: string) {
  try {
    // Try the integrated approach first to reduce API calls
    const integratedResponse = await detectAndExecuteAction(projectId, userMessage);

    // If the integrated approach produced a meaningful response, use it
    if (integratedResponse && integratedResponse.length > 20 && !integratedResponse.includes("I encountered an error")) {
      // Store the messages
      await storeEnhancedMessage(projectId, {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      });

      await storeEnhancedMessage(projectId, {
        role: "assistant",
        content: integratedResponse,
        timestamp: new Date(),
      });

      return integratedResponse;
    }

    // Fall back to the simple chain
    const chain = await createSimpleChain(projectId);

    // Store the user message
    await storeEnhancedMessage(projectId, {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    // Run the chain
    const result = await chain.invoke({
      input: userMessage,
    });

    // Store the assistant message
    await storeEnhancedMessage(projectId, {
      role: "assistant",
      content: result,
      timestamp: new Date(),
    });

    return result;
  } catch (error) {
    console.error("Error processing simple message:", error);
    return "I encountered an error while processing your message.";
  }
}
