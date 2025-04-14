/**
 * Enhanced Multi-Agent System
 * This file implements a sophisticated multi-agent system using LangChain's agent framework
 * with advanced tools, enhanced prompts, and specialized agents for more natural and intelligent interactions
 */

import { ChatGroq } from "@langchain/groq";
import { AgentExecutor } from "langchain/agents";
// No need for these imports
import { createOpenAIFunctionsAgent } from "langchain/agents";
import { SystemMessage } from "@langchain/core/messages";
// Import dependencies
import { storeEnhancedMessage, getEnhancedProjectContext } from "../memory/enhanced";
import { getProjectInfo, getProjectTools } from "./tools";
import { getEnhancedMultiAgentPrompt } from "../prompts/enhanced-prompts";
import { LLMCache } from "./cache";

// Cache for LLM responses to reduce API calls
const llmCache = new LLMCache();

/**
 * Agent types for specialized tasks
 */
export enum AgentType {
  PLANNER = "PLANNER",
  EXECUTOR = "EXECUTOR",
  ANALYZER = "ANALYZER",
  CREATOR = "CREATOR",
  REFLECTOR = "REFLECTOR",
  CONVERSATIONAL = "CONVERSATIONAL"
}

/**
 * Configuration for the multi-agent system
 */
const agentConfig = {
  model: "llama3-70b-8192",
  temperature: 0.7,
  maxTokens: 2000,
  cacheTTL: 3600, // 1 hour cache TTL
};

/**
 * Create a LangChain model with caching
 * @param temperature - The temperature to use for the model
 * @returns A LangChain model
 */
function createModel(temperature: number = agentConfig.temperature) {
  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY || "",
    model: agentConfig.model,
    temperature,
    maxTokens: agentConfig.maxTokens,
    cache: llmCache,
  });

  return model;
}

/**
 * Create a comprehensive system message for the agent
 * @param projectId - The ID of the project
 * @param query - The query to use for context retrieval
 * @param agentType - The type of agent to create the message for
 * @returns A system message
 */
async function createSystemMessage(
  projectId: string,
  query: string = "",
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
 * Create a specialized agent for a specific task
 * @param projectId - The ID of the project
 * @param query - The query to use for context retrieval
 * @param agentType - The type of agent to create
 * @returns A LangChain agent executor
 */
async function createSpecializedAgent(
  projectId: string,
  query: string = "",
  agentType: AgentType
) {
  try {
    // Create buffer memory
    const { BufferMemory } = await import("langchain/memory");
    const bufferMemory = new BufferMemory();

    // Get comprehensive project tools
    const tools = getProjectTools(projectId);

    // Log the number of tools available to the agent
    console.log(`Loaded ${tools.length} tools for the ${agentType} agent`);

    // Create the system message for this specific agent type
    const systemMessage = await createSystemMessage(projectId, query, agentType);

    // Adjust temperature based on agent type
    let temperature = agentConfig.temperature;
    switch (agentType) {
      case AgentType.PLANNER:
      case AgentType.ANALYZER:
        temperature = 0.3; // Lower temperature for more precise reasoning
        break;
      case AgentType.CREATOR:
        temperature = 0.8; // Higher temperature for more creativity
        break;
      case AgentType.EXECUTOR:
        temperature = 0.2; // Very low temperature for precise execution
        break;
      case AgentType.REFLECTOR:
        temperature = 0.5; // Balanced temperature for reflection
        break;
      case AgentType.CONVERSATIONAL:
      default:
        temperature = 0.7; // Default temperature for conversation
        break;
    }

    // Create the model with appropriate temperature
    const model = createModel(temperature);

    try {
      // Create the agent with proper tool selection
      const agent = await createOpenAIFunctionsAgent({
        llm: model,
        tools,
        systemMessage,
      });

      // Create the executor
      const agentExecutor = new AgentExecutor({
        agent,
        tools,
        memory: bufferMemory,
        verbose: true,
      });

      return agentExecutor;
    } catch (agentError) {
      console.error(`Failed to create ${agentType} agent with createOpenAIFunctionsAgent:`, agentError);

      // Create a fallback agent that just uses the model directly
      return {
        invoke: async ({ input }: { input: string }) => {
          try {
            if (!input) {
              return { output: "I didn't receive any message. Please try again with a specific request." };
            }

            const response = await model.invoke(
              `${systemMessage.content}\n\nUser: ${input}\n\nAssistant: `
            );

            return { output: response.content || "I processed your request but didn't generate a response. Please try again." };
          } catch (error) {
            console.error(`Error in fallback ${agentType} agent:`, error);
            return { output: "I encountered an error while processing your message. Please try again." };
          }
        }
      };
    }
  } catch (error) {
    console.error(`Failed to create ${agentType} agent:`, error);

    // Return a minimal working executor that doesn't throw errors
    return {
      invoke: async (_: { input: string }) => {
        return {
          output: `I'm having trouble setting up the ${agentType} agent. Please try again later or contact support if the issue persists.`
        };
      }
    };
  }
}

// Plan schema removed as it's not being used

/**
 * Create a plan for handling a user request
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns A structured plan
 */
async function createPlan(projectId: string, userMessage: string) {
  try {
    // Create a planner agent
    const plannerAgent = await createSpecializedAgent(projectId, userMessage, AgentType.PLANNER);

    // Create the prompt for the planner
    const promptTemplate = `
You are a planning agent for a project management system. Your task is to create a detailed plan for handling this user request:

"${userMessage}"

First, analyze what the user is asking for. Then, create a structured plan with clear steps.
Consider whether specialized agents are needed for different parts of the task.

Your response should be a JSON object with the following structure:
{
  "goal": "The main goal to achieve",
  "requires_specialized_agents": true/false,
  "steps": [
    {
      "step_number": 1,
      "description": "Description of the step",
      "agent_type": "PLANNER/EXECUTOR/ANALYZER/CREATOR/REFLECTOR/CONVERSATIONAL",
      "expected_output": "What this step should produce",
      "is_api_call_required": true/false
    }
  ],
  "potential_issues": ["Issue 1", "Issue 2"],
  "fallback_plan": "What to do if the main plan fails"
}
    `.trim();

    // Run the planner agent
    const result = await plannerAgent.invoke({
      input: promptTemplate,
    });

    // Try to parse the result as a structured plan
    try {
      // Extract JSON from the result
      const jsonMatch = result.output.match(/```json\s*([\s\S]*?)\s*```/) ||
                        result.output.match(/```\s*([\s\S]*?)\s*```/) ||
                        result.output.match(/(\{[\s\S]*\})/);

      if (jsonMatch) {
        const jsonString = jsonMatch[1];
        const plan = JSON.parse(jsonString);
        return plan;
      }
    } catch (parseError) {
      console.error("Failed to parse plan:", parseError);
      // Continue with unstructured plan
    }

    // If parsing failed, return a simple plan
    return {
      goal: "Handle user request",
      requires_specialized_agents: false,
      steps: [
        {
          step_number: 1,
          description: "Process user request",
          agent_type: AgentType.CONVERSATIONAL,
          expected_output: "Response to user",
          is_api_call_required: true,
        }
      ],
      potential_issues: ["Might not understand complex requests"],
      fallback_plan: "Use conversational agent to respond",
    };
  } catch (error) {
    console.error("Failed to create plan:", error);

    // Return a fallback plan
    return {
      goal: "Handle user request with fallback plan",
      requires_specialized_agents: false,
      steps: [
        {
          step_number: 1,
          description: "Process user request with conversational agent",
          agent_type: AgentType.CONVERSATIONAL,
          expected_output: "Simple response to user",
          is_api_call_required: true,
        }
      ],
      potential_issues: ["Original planning failed"],
      fallback_plan: "Use conversational agent to apologize and respond simply",
    };
  }
}

/**
 * Execute a plan using specialized agents
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @param plan - The plan to execute
 * @returns The result of executing the plan
 */
async function executePlan(projectId: string, userMessage: string, plan: { steps: Array<{ step_number: number; description: string; agent_type: string; is_api_call_required: boolean }> }) {
  try {
    let finalResponse = "";
    const intermediateResults: Record<string, unknown> = {};

    // Execute each step in the plan
    for (const step of plan.steps) {
      console.log(`Executing step ${step.step_number}: ${step.description} with ${step.agent_type} agent`);

      // Skip API calls if possible by using cached results or previous steps
      if (step.is_api_call_required) {
        // Check if we can reuse results from a previous step
        const cachedResult = llmCache.get(`${projectId}:${userMessage}:${step.description}`);
        if (cachedResult) {
          console.log(`Using cached result for step ${step.step_number}`);
          intermediateResults[`step_${step.step_number}`] = cachedResult;
          continue;
        }

        // Create the appropriate agent for this step
        const agent = await createSpecializedAgent(
          projectId,
          userMessage,
          step.agent_type as AgentType
        );

        // Create the input for this step, including results from previous steps
        const stepInput = `
Step ${step.step_number}: ${step.description}

User message: "${userMessage}"

${Object.keys(intermediateResults).length > 0 ? `Results from previous steps:\n${JSON.stringify(intermediateResults, null, 2)}` : ""}

Your task: ${step.expected_output}
        `.trim();

        // Execute the agent
        const stepResult = await agent.invoke({
          input: stepInput,
        });

        // Store the result
        intermediateResults[`step_${step.step_number}`] = stepResult.output;

        // Cache the result
        llmCache.set(`${projectId}:${userMessage}:${step.description}`, stepResult.output, agentConfig.cacheTTL);
      } else {
        // For steps that don't require API calls, use local processing
        console.log(`Skipping API call for step ${step.step_number}`);
        intermediateResults[`step_${step.step_number}`] = `Skipped API call for: ${step.description}`;
      }
    }

    // Combine results into a final response
    if (plan.requires_specialized_agents) {
      // Use a reflector agent to create a coherent final response
      const reflectorAgent = await createSpecializedAgent(projectId, userMessage, AgentType.REFLECTOR);

      const reflectionPrompt = `
I've completed the steps to handle the user's request: "${userMessage}"

Here are the results from each step:
${Object.entries(intermediateResults).map(([step, result]) => `${step}: ${result}`).join('\n\n')}

Please create a coherent, helpful response that addresses the user's request based on these results.
Make sure the response is natural, helpful, and directly addresses what the user asked for.
      `.trim();

      const reflectionResult = await reflectorAgent.invoke({
        input: reflectionPrompt,
      });

      finalResponse = reflectionResult.output;
    } else {
      // For simple plans, just use the result of the last step
      const lastStepKey = `step_${plan.steps.length}`;
      finalResponse = intermediateResults[lastStepKey] || "I've processed your request, but I'm not sure how to respond.";
    }

    return finalResponse;
  } catch (error) {
    console.error("Failed to execute plan:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
}

/**
 * Process a user message using the proper multi-agent orchestration system
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The orchestrated response
 */
export async function processUserMessage(projectId: string, userMessage: string) {
  try {
    // Validate inputs
    if (!projectId) {
      console.error("Project ID is required");
      return "I need a project context to help you. Please try again from a project page.";
    }

    if (!userMessage) {
      console.error("User message is required");
      return "I didn't receive any message. Please try again with a specific request.";
    }

    // Store the user message
    await storeEnhancedMessage(projectId, {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    // Check if we have a cached response for this exact message
    const cachedResponse = llmCache.get(`${projectId}:${userMessage}:final_response`);
    if (cachedResponse) {
      console.log("Using cached final response");

      // Store the cached response
      await storeEnhancedMessage(projectId, {
        role: "assistant",
        content: cachedResponse,
        timestamp: new Date(),
      });

      return cachedResponse;
    }

    // Create a plan for handling the user's request
    console.log("Creating plan for user message:", userMessage);
    const plan = await createPlan(projectId, userMessage);
    console.log("Plan created:", JSON.stringify(plan, null, 2));

    // Execute the plan
    console.log("Executing plan");
    const response = await executePlan(projectId, userMessage, plan);
    console.log("Plan executed");

    // Store the assistant message
    await storeEnhancedMessage(projectId, {
      role: "assistant",
      content: response,
      timestamp: new Date(),
    });

    // Cache the response
    llmCache.set(`${projectId}:${userMessage}:final_response`, response, agentConfig.cacheTTL);

    return response;
  } catch (error) {
    console.error("Error in proper multi-agent orchestration:", error);

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
 * Process a conversation with the user using the proper multi-agent system
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @param conversationHistory - The conversation history
 * @returns The agent's response
 */
export async function processConversation(
  projectId: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
) {
  try {
    // Validate inputs
    if (!projectId) {
      console.error("Project ID is required");
      return "I need a project context to help you. Please try again from a project page.";
    }

    if (!userMessage) {
      console.error("User message is required");
      return "I didn't receive any message. Please try again with a specific request.";
    }

    // Store the user message
    await storeEnhancedMessage(projectId, {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    // Format the conversation history for context
    for (const msg of conversationHistory) {
      if (msg.role === "user") {
        await storeEnhancedMessage(projectId, {
          role: "user",
          content: msg.content,
          timestamp: new Date(Date.now() - 60000), // 1 minute ago
        });
      } else if (msg.role === "assistant") {
        await storeEnhancedMessage(projectId, {
          role: "assistant",
          content: msg.content,
          timestamp: new Date(Date.now() - 30000), // 30 seconds ago
        });
      }
    }

    // Create a conversational agent
    const conversationalAgent = await createSpecializedAgent(
      projectId,
      userMessage,
      AgentType.CONVERSATIONAL
    );

    // Run the conversational agent
    const result = await conversationalAgent.invoke({
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
    console.error("Error processing conversation with proper multi-agent system:", error);

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
