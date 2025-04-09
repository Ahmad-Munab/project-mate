/**
 * Multi-Agent Orchestrator
 * This file implements a sophisticated multi-agent orchestration system
 * that coordinates multiple specialized agents to solve complex tasks
 * with minimal API calls and maximum intelligence.
 */

import { ChatGroq } from "@langchain/groq";
import { AgentExecutor, createOpenAIFunctionsAgent, createReactAgent } from "langchain/agents";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { RunnableSequence, RunnableBranch } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { getProjectTools } from "./tools";
import { createEnhancedMemory, storeEnhancedMessage, getProjectInfo, getProjectContext } from "./enhanced-vector-memory";
import { detectAction, detectAndExecuteAction, ActionType } from "./action-detector";
import { LLMCache } from "./cache";

// Cache for LLM responses to reduce API calls
const llmCache = new LLMCache();

/**
 * Agent types for specialized tasks
 */
enum AgentType {
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
    apiKey: process.env.GROQ_API_KEY!,
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
    // Get project information and context in a single operation
    const [projectInfo, vectorContext] = await Promise.all([
      getProjectInfo(projectId),
      getProjectContext(projectId, query)
    ]);

    // Base system message that all agents share
    let baseMessage = `
You are Mate, an advanced AI agent for project management.
You help users manage their project "${projectInfo.project.name}".

Project description: ${projectInfo.project.description || "No description provided"}

Project stats:
- ${projectInfo.tasks.length} tasks
- ${projectInfo.members.length} members

${vectorContext ? `Relevant context from project history:\n${vectorContext}\n\n` : ""}

Project Tasks:
${projectInfo.tasks.map(task => `- ${task.title} (Status: ${task.status}, Priority: ${task.priority})`).join('\n')}
    `.trim();

    // Add specialized instructions based on agent type
    let specializedInstructions = "";

    switch (agentType) {
      case AgentType.PLANNER:
        specializedInstructions = `
You are the PLANNING AGENT. Your job is to:
1. Analyze user requests to determine what actions need to be taken
2. Break down complex requests into smaller, actionable steps
3. Create a structured plan with clear steps
4. Consider multiple approaches and choose the most efficient one
5. Identify potential issues or edge cases in the plan

Think step by step and be thorough in your planning.
        `.trim();
        break;

      case AgentType.EXECUTOR:
        specializedInstructions = `
You are the EXECUTION AGENT. Your job is to:
1. Execute the planned actions using the available tools
2. Handle errors and edge cases gracefully
3. Provide clear feedback on the results of each action
4. Adapt to changing circumstances during execution
5. Ensure all actions are completed successfully

Use the most appropriate tool for each action and be precise in your execution.
        `.trim();
        break;

      case AgentType.ANALYZER:
        specializedInstructions = `
You are the ANALYSIS AGENT. Your job is to:
1. Analyze the project's current state and progress
2. Identify patterns, bottlenecks, and areas for improvement
3. Provide data-driven insights and recommendations
4. Consider both short-term and long-term implications
5. Suggest concrete actions based on your analysis

Be thorough in your analysis and provide actionable insights.
        `.trim();
        break;

      case AgentType.CREATOR:
        specializedInstructions = `
You are the CREATION AGENT. Your job is to:
1. Create new tasks, columns, and other project elements
2. Ensure new elements are well-structured and clearly defined
3. Consider how new elements fit into the existing project structure
4. Provide clear descriptions and context for new elements
5. Suggest related elements that might be needed

Be creative but practical in your suggestions.
        `.trim();
        break;

      case AgentType.REFLECTOR:
        specializedInstructions = `
You are the REFLECTION AGENT. Your job is to:
1. Review the actions taken and their results
2. Identify what went well and what could be improved
3. Suggest improvements to the process for future interactions
4. Consider alternative approaches that might have been more effective
5. Learn from both successes and failures

Be honest and constructive in your reflections.
        `.trim();
        break;

      case AgentType.CONVERSATIONAL:
      default:
        specializedInstructions = `
You are the CONVERSATIONAL AGENT. Your job is to:
1. Engage with the user in a helpful, natural conversation
2. Understand the user's needs and preferences
3. Provide clear, concise, and relevant responses
4. Maintain context across the conversation
5. Be proactive in suggesting relevant actions or information

Be helpful, friendly, and focused on delivering value to the user.
        `.trim();
        break;
    }

    // Combine base message and specialized instructions
    const fullMessage = `${baseMessage}\n\n${specializedInstructions}`;

    return new SystemMessage(fullMessage);
  } catch (error) {
    console.error(`Failed to create system message for ${agentType} agent:`, error);
    throw error;
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
    // Get enhanced vector memory
    const enhancedMemory = await createEnhancedMemory(projectId);
    const memory = enhancedMemory.createBufferMemory();

    // Get project tools
    const tools = getProjectTools(projectId);

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

    // Choose agent type based on the task
    let agent;
    if (agentType === AgentType.ANALYZER || agentType === AgentType.PLANNER) {
      // Use ReAct agent for more complex reasoning
      agent = await createReactAgent({
        llm: model,
        tools,
        systemMessage,
      });
    } else {
      // Use OpenAI Functions agent for other tasks
      agent = await createOpenAIFunctionsAgent({
        llm: model,
        tools,
        systemMessage,
      });
    }

    // Create the executor with configuration appropriate for the agent type
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      memory,
      verbose: true,
      returnIntermediateSteps: true,
      maxIterations: agentType === AgentType.EXECUTOR ? 15 : 10, // More iterations for executor
      earlyStoppingMethod: "generate",
    });

    return agentExecutor;
  } catch (error) {
    console.error(`Failed to create ${agentType} agent:`, error);
    throw error;
  }
}

/**
 * Plan schema for structured planning
 */
const planSchema = z.object({
  goal: z.string().describe("The main goal to achieve"),
  requires_specialized_agents: z.boolean().describe("Whether specialized agents are needed"),
  steps: z.array(
    z.object({
      step_number: z.number().describe("The step number"),
      description: z.string().describe("Description of the step"),
      agent_type: z.enum([
        AgentType.PLANNER,
        AgentType.EXECUTOR,
        AgentType.ANALYZER,
        AgentType.CREATOR,
        AgentType.REFLECTOR,
        AgentType.CONVERSATIONAL
      ]).describe("The type of agent best suited for this step"),
      expected_output: z.string().describe("What this step should produce"),
      is_api_call_required: z.boolean().describe("Whether this step requires an API call"),
    })
  ).describe("The steps to achieve the goal"),
  potential_issues: z.array(z.string()).describe("Potential issues that might arise"),
  fallback_plan: z.string().describe("What to do if the main plan fails"),
});

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

    // Create the output parser
    const outputParser = StructuredOutputParser.fromZodSchema(planSchema);

    // Create the prompt template
    const promptTemplate = `
You are a planning agent for a project management system. Your task is to create a detailed plan for handling this user request:

"${userMessage}"

First, analyze what the user is asking for. Then, create a structured plan with clear steps.
Consider whether specialized agents are needed for different parts of the task.

${outputParser.getFormatInstructions()}
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
async function executePlan(projectId: string, userMessage: string, plan: any) {
  try {
    let finalResponse = "";
    let intermediateResults: Record<string, any> = {};

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
 * Process a user message using the multi-agent orchestration system
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The orchestrated response
 */
export async function processUserMessage(projectId: string, userMessage: string) {
  try {
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

    // First, try the integrated approach to reduce API calls
    // This handles simple actions without the full orchestration
    const integratedResponse = await detectAndExecuteAction(projectId, userMessage);

    // If the integrated approach produced a meaningful response, use it
    if (integratedResponse &&
        integratedResponse.length > 20 &&
        !integratedResponse.includes("I encountered an error") &&
        !integratedResponse.includes("I'm not sure")) {

      // Store the assistant message
      await storeEnhancedMessage(projectId, {
        role: "assistant",
        content: integratedResponse,
        timestamp: new Date(),
      });

      // Cache the response
      llmCache.set(`${projectId}:${userMessage}:final_response`, integratedResponse, agentConfig.cacheTTL);

      return integratedResponse;
    }

    // For more complex requests, use the full orchestration system

    // 1. Create a plan
    const plan = await createPlan(projectId, userMessage);

    // 2. Execute the plan
    const response = await executePlan(projectId, userMessage, plan);

    // 3. Store the assistant message
    await storeEnhancedMessage(projectId, {
      role: "assistant",
      content: response,
      timestamp: new Date(),
    });

    // 4. Cache the response
    llmCache.set(`${projectId}:${userMessage}:final_response`, response, agentConfig.cacheTTL);

    return response;
  } catch (error) {
    console.error("Error in multi-agent orchestration:", error);

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
 * Process a conversation with the user
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
    // Store the user message
    await storeEnhancedMessage(projectId, {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    // Create a conversational agent
    const conversationalAgent = await createSpecializedAgent(
      projectId,
      userMessage,
      AgentType.CONVERSATIONAL
    );

    // Format the conversation history
    const formattedHistory = conversationHistory.map(msg => {
      if (msg.role === "user") {
        return `User: ${msg.content}`;
      } else if (msg.role === "assistant") {
        return `Assistant: ${msg.content}`;
      } else {
        return `${msg.role}: ${msg.content}`;
      }
    }).join("\n\n");

    // Create the input with conversation history
    const input = `
${formattedHistory ? `Conversation history:\n${formattedHistory}\n\n` : ""}

User's latest message: "${userMessage}"

Please respond to the user's message in a helpful, conversational way.
If they're asking you to perform an action, explain what you're going to do and then do it.
If they're asking a question, provide a thorough but concise answer.
If they're making a statement, acknowledge it and respond appropriately.
    `.trim();

    // Run the agent
    const result = await conversationalAgent.invoke({
      input,
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
    console.error("Error processing conversation:", error);

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
