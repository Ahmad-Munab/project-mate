/**
 * Tiered Agent Architecture
 * This file implements an optimized agent architecture using a tiered approach
 * with different models for different tasks to improve performance and reduce costs
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";
import { getAgentTools } from "./tools";
import { storeOptimizedMessage } from "../memory/optimized-memory";
import { getProjectInfo } from "../langchain/tools";
import { groqRateLimiter } from "../utils/rate-limiter";

// Tool result cache
const toolResultCache = new Map<string, {result: any, timestamp: number}>();
const TOOL_CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutes

/**
 * Configuration for different models in the tiered architecture
 */
const modelConfig = {
  router: {
    model: "llama3-8b-8192", // Smaller, faster model for routing
    temperature: 0.3,
    maxTokens: 300,
  },
  executor: {
    model: "llama3-70b-8192", // Larger model for complex tasks
    temperature: 0.7,
    maxTokens: 1000,
  },
  summarizer: {
    model: "llama3-8b-8192", // Smaller model for summarization
    temperature: 0.3,
    maxTokens: 300,
  }
};

/**
 * Get cached tool result
 * @param toolName - The name of the tool
 * @param params - The parameters for the tool
 * @returns The cached result or null if not found
 */
function getCachedToolResult(toolName: string, params: Record<string, any>) {
  const cacheKey = `${toolName}:${JSON.stringify(params)}`;
  const cached = toolResultCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < TOOL_CACHE_EXPIRATION)) {
    console.log(`Using cached result for ${toolName}`);
    return cached.result;
  }

  return null;
}

/**
 * Cache tool result
 * @param toolName - The name of the tool
 * @param params - The parameters for the tool
 * @param result - The result to cache
 */
function cacheToolResult(toolName: string, params: Record<string, any>, result: any) {
  const cacheKey = `${toolName}:${JSON.stringify(params)}`;
  toolResultCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });

  // Implement LRU cache eviction
  if (toolResultCache.size > 200) {
    const oldestKey = [...toolResultCache.entries()]
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
    toolResultCache.delete(oldestKey);
  }
}

/**
 * Group tool calls by type for batch processing
 * @param toolCalls - Array of tool calls (RegExpExecArray)
 * @returns Grouped tool calls by type
 */
function groupToolCallsByType(toolCalls: RegExpExecArray[]) {
  const grouped: Record<string, Array<{name: string, params: any}>> = {};

  for (const match of toolCalls) {
    const name = match[1];
    const paramsStr = match[2];

    if (!grouped[name]) {
      grouped[name] = [];
    }

    try {
      const params = JSON.parse(paramsStr);
      grouped[name].push({ name, params });
    } catch (error) {
      console.error(`Error parsing parameters for ${name}:`, error);
    }
  }

  return grouped;
}

/**
 * Execute a single tool call
 * @param toolName - The name of the tool
 * @param params - The parameters for the tool
 * @param tools - Available tools
 * @returns The result of the tool call
 */
async function executeToolCall(toolName: string, params: any, tools: any[]) {
  // Check cache first
  const cachedResult = getCachedToolResult(toolName, params);
  if (cachedResult) {
    return cachedResult;
  }

  // Find the tool
  const tool = tools.find(t => t.name === toolName);
  if (!tool) {
    return JSON.stringify({
      success: false,
      error: `Tool ${toolName} not found`
    });
  }

  try {
    // Execute the tool
    const result = await tool.func(params);

    // Cache the result
    cacheToolResult(toolName, params, result);

    return result;
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Batch execute tool calls
 * @param groupedCalls - Grouped tool calls by type
 * @param tools - Available tools
 * @returns Results of all tool calls
 */
async function batchExecuteTools(groupedCalls: Record<string, Array<{name: string, params: any}>>, tools: any[]) {
  const results: any[] = [];

  // Process each group of tool calls
  await Promise.all(
    Object.entries(groupedCalls).map(async ([toolType, calls]) => {
      // Special handling for batch operations
      if (toolType === 'create_task' && calls.length > 1) {
        // Find the batch tool if available
        const batchTool = tools.find(t => t.name === 'batch_create_tasks');

        if (batchTool) {
          // Extract all task parameters
          const taskParams = calls.map(call => call.params);

          try {
            // Execute batch operation
            const batchResult = await batchTool.func({ tasks: taskParams });
            const parsedResult = typeof batchResult === 'string' ? JSON.parse(batchResult) : batchResult;

            // Add individual results
            if (parsedResult.success && Array.isArray(parsedResult.tasks)) {
              for (let i = 0; i < calls.length; i++) {
                const task = parsedResult.tasks[i] || null;
                results.push({
                  toolName: calls[i].name,
                  params: calls[i].params,
                  result: JSON.stringify({
                    success: !!task,
                    task: task
                  })
                });
              }
            } else {
              // Handle batch failure
              for (const call of calls) {
                results.push({
                  toolName: call.name,
                  params: call.params,
                  result: JSON.stringify({
                    success: false,
                    error: 'Batch operation failed'
                  })
                });
              }
            }
          } catch (error) {
            console.error('Error in batch operation:', error);
            // Fall back to individual execution
            for (const call of calls) {
              const result = await executeToolCall(call.name, call.params, tools);
              results.push({
                toolName: call.name,
                params: call.params,
                result
              });
            }
          }
        } else {
          // No batch tool available, execute individually
          for (const call of calls) {
            const result = await executeToolCall(call.name, call.params, tools);
            results.push({
              toolName: call.name,
              params: call.params,
              result
            });
          }
        }
      } else {
        // Execute tools individually
        for (const call of calls) {
          const result = await executeToolCall(call.name, call.params, tools);
          results.push({
            toolName: call.name,
            params: call.params,
            result
          });
        }
      }
    })
  );

  return results;
}

/**
 * Route a user message to determine which tools to use
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @param tools - Available tools
 * @returns Array of required tool names
 */
async function routeRequest(projectId: string, userMessage: string, tools: any[]) {
  return groqRateLimiter.enqueue(async () => {
    try {
      // Create router model
      const routerModel = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY!,
        model: modelConfig.router.model,
        temperature: modelConfig.router.temperature,
        maxTokens: modelConfig.router.maxTokens,
      });

      // Create router prompt
      const routerPrompt = `
        Determine which tools are needed to respond to this user message: "${userMessage}"

        Available tools:
        ${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

        Return only a JSON array of tool names, e.g. ["get_project_info", "create_task"]
        If no tools are needed, return an empty array.
      `;

      // Get router response
      const response = await routerModel.invoke(routerPrompt);
      const content = response.content as string;

      try {
        // Check if the content looks like JSON
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          // Parse response as JSON
          return JSON.parse(content);
        } else {
          console.log('Router response is not JSON format, using regex extraction');
          // Extract tool names using regex
          const toolNames = tools.map(t => t.name);

          // Look for tool names in the content
          const toolMatches = toolNames.filter(name =>
            content.toLowerCase().includes(name.toLowerCase())
          );

          if (toolMatches.length > 0) {
            console.log('Found tool matches using name search:', toolMatches);
            return toolMatches;
          }

          // Try to extract quoted strings as a fallback
          const matches = content.match(/"([^"]+)"/g);
          if (matches) {
            const extractedNames = matches
              .map(m => m.replace(/"/g, ''))
              .filter(name => toolNames.includes(name));

            console.log('Found tool matches using quoted strings:', extractedNames);
            return extractedNames;
          }

          console.log('No tool matches found, returning empty array');
          return [];
        }
      } catch (error) {
        console.error('Error parsing router response:', error);
        // Extract tool names using regex as fallback
        const toolNames = tools.map(t => t.name);
        const matches = content.match(/"([^"]+)"/g);
        if (matches) {
          const extractedNames = matches
            .map(m => m.replace(/"/g, ''))
            .filter(name => toolNames.includes(name));

          console.log('Found tool matches after error:', extractedNames);
          return extractedNames;
        }
        return [];
      }
    } catch (error) {
      console.error('Error routing request:', error);
      return [];
    }
  });
}

/**
 * Create a tiered agent for a project
 * @param projectId - The ID of the project
 * @returns A function that can process user messages
 */
export async function createTieredAgent(projectId: string) {
  try {
    // Get project context using the simple memory system
    const { createSimpleMemory } = await import("../langchain/simple-memory");
    const memory = await createSimpleMemory(projectId);
    await memory.initialize();

    // Get context from the memory
    const projectContext = await memory.getContext("What is the current state of the project?");

    // Get project info
    const projectInfo = await getProjectInfo(projectId);

    // Get project tools
    const tools = getAgentTools(projectId);
    console.log(`Loaded ${tools.length} tools for the agent`);

    // Import enhanced prompts and tools
    const { getEnhancedBasePrompt, getEnhancedProjectContextSection, getEnhancedIntelligenceGuidelines } = await import("../prompts/enhanced-prompts");
    const { getTaskStatuses } = await import("../langchain/tools");

    // Get task statuses for context
    let taskStatuses: Array<{name: string; key: string; color?: string}> = [];
    let columnNames: string[] = [];
    try {
      taskStatuses = await getTaskStatuses(projectId);
      columnNames = taskStatuses.map(status => status.name);
    } catch (error) {
      console.warn("Could not fetch task statuses:", error);
      taskStatuses = [];
      columnNames = ["Backlog", "In Progress", "Done"];
    }

    // Create system message
    const systemMessage = new SystemMessage(`
      ${getEnhancedBasePrompt()}

      ${getEnhancedProjectContextSection(projectInfo, taskStatuses, columnNames, projectContext)}

      Available Tools:
      ${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

      Rules:
      - Use tools for actions (create_task, move_task, etc.).
      - You MUST use MULTIPLE TOOLS in sequence when needed to complete complex tasks.
      - Always think about which combination of tools would best solve the user's request.
      - For complex operations, break them down into a sequence of tool calls.
      - Be conversational and natural in your responses.
      - Use contractions, varied sentence structures, and natural language.
      - Show personality and empathy in your responses.
      - Format tool calls as: <tool>name</tool><parameters>{...}</parameters>.
      - Never show raw JSON to users.
      - Make action decisions with caution and more context.
      - When managing tasks, consider using batch operations when appropriate.

      ${getEnhancedIntelligenceGuidelines()}

      Examples of tool usage:

      Example 1 - Simple task creation:
      User: "Create a task to implement user authentication"
      Assistant: I'll create that task for you right away.
      <tool>create_task</tool><parameters>{"title":"Implement user authentication","description":"Add user authentication functionality including login, registration, and password reset.","status":"BACKLOG","priority":"HIGH"}</parameters>

      Example 2 - Getting information:
      User: "What tasks are in the backlog?"
      Assistant: Let me check the backlog for you.
      <tool>get_project_tasks</tool><parameters>{}</parameters>

      Example 3 - Multiple tool usage:
      User: "Create three tasks for setting up the database, implementing the API, and creating the frontend"
      Assistant: I'll create those tasks for you right away.
      <tool>batch_create_tasks</tool><parameters>{"tasks":[{"title":"Set up database schema","description":"Create the database schema with tables for users, products, and orders.","status":"BACKLOG","priority":"HIGH"},{"title":"Implement REST API","description":"Create API endpoints for user authentication, product management, and order processing.","status":"BACKLOG","priority":"HIGH"},{"title":"Develop frontend UI","description":"Create the user interface with React components for all main features.","status":"BACKLOG","priority":"MEDIUM"}]}</parameters>

      Example 4 - Complex workflow:
      User: "Move all high priority tasks to the Development column"
      Assistant: I'll find all high priority tasks and move them to the Development column.
      <tool>search_tasks</tool><parameters>{"priority":"HIGH"}</parameters>
      Now I'll move these tasks to the Development column.
      <tool>bulk_move_tasks</tool><parameters>{"taskIds":["task-id-1","task-id-2","task-id-3"],"targetStatus":"DEVELOPMENT"}</parameters>

      Example 5 - Project management:
      User: "Generate a report on our project progress"
      Assistant: I'll generate a comprehensive report for you.
      <tool>generate_project_report</tool><parameters>{}</parameters>
    `);

    // Create executor model
    const executorModel = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: modelConfig.executor.model,
      temperature: modelConfig.executor.temperature,
      maxTokens: modelConfig.executor.maxTokens,
    });

    // Return a function that can process user messages
    return {
      processMessage: async (userMessage: string) => {
        try {
          // Generate a cache key based on the user message and project ID
          const cacheKey = `${projectId}:${userMessage.trim().toLowerCase()}`;

          // Route the request to determine which tools to use
          const requiredTools = await routeRequest(projectId, userMessage, tools);

          // If no tools are required, use the executor model directly
          if (requiredTools.length === 0) {
            return groqRateLimiter.enqueue(async () => {
              const response = await executorModel.invoke([
                systemMessage,
                { role: "user", content: userMessage }
              ]);
              return response.content as string;
            });
          }

          // Use the executor model to generate a response with tool calls
          const response = await groqRateLimiter.enqueue(async () => {
            return executorModel.invoke([
              systemMessage,
              { role: "user", content: userMessage }
            ]);
          });

          // Extract tool usage from the response
          const content = response.content as string;
          const toolMatches = Array.from(content.matchAll(/<tool>(.*?)<\/tool>\s*<parameters>\s*({[\s\S]*?})\s*<\/parameters>/gi));

          if (toolMatches.length > 0) {
            console.log(`Found ${toolMatches.length} tool calls in the response`);

            // Group tool calls by type
            const groupedCalls = groupToolCallsByType(toolMatches);

            // Execute all tool calls
            const toolResults = await batchExecuteTools(groupedCalls, tools);

            // Format results for the user
            if (toolResults.length === 1) {
              // For a single result, extract the relevant information
              try {
                const result = JSON.parse(toolResults[0].result);
                if (result.success) {
                  // Replace the tool call in the original response
                  let userFriendlyResponse = content.replace(
                    new RegExp('<tool>.*?</tool>\\s*<parameters>.*?</parameters>', 'i'),
                    result.message || `I've completed that action successfully.`
                  );

                  // Clean up any remaining tool calls
                  userFriendlyResponse = userFriendlyResponse.replace(
                    new RegExp('<tool>.*?</tool>\\s*<parameters>.*?</parameters>', 'gi'),
                    ''
                  );

                  return userFriendlyResponse;
                } else {
                  return `I tried to ${toolResults[0].toolName.replace('_', ' ')}, but encountered an error: ${result.error || 'Unknown error'}`;
                }
              } catch (error) {
                console.error('Error parsing tool result:', error);
                return `I completed the action, but encountered an error formatting the response.`;
              }
            } else {
              // For multiple results, create a summary
              const successCount = toolResults.filter(r => {
                try {
                  const result = JSON.parse(r.result);
                  return result.success;
                } catch {
                  return false;
                }
              }).length;

              if (successCount === toolResults.length) {
                return `I've completed all ${toolResults.length} actions successfully.`;
              } else {
                return `I completed ${successCount} out of ${toolResults.length} actions. Some actions couldn't be completed.`;
              }
            }
          }

          // If no tool calls were processed, return the original content
          return content;
        } catch (error) {
          console.error("Error processing message:", error);
          return "I'm sorry, I encountered an error while processing your message. Please try again.";
        }
      }
    };
  } catch (error) {
    console.error("Failed to create tiered agent:", error);
    throw error;
  }
}

/**
 * Run the tiered agent with a user message
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The agent's response
 */
export async function runTieredAgent(projectId: string, userMessage: string) {
  try {
    // Create the agent
    const agent = await createTieredAgent(projectId);

    // Store the user message
    await storeOptimizedMessage(
      projectId,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }
    );

    // Process the message with the agent
    const response = await agent.processMessage(userMessage);

    // Ensure we have a valid response
    const finalResponse = typeof response === 'string' && response.trim() ?
      response :
      "I've processed your request, but I don't have a detailed response to provide at this moment.";

    // Store the assistant message
    await storeOptimizedMessage(
      projectId,
      {
        role: "assistant",
        content: finalResponse,
        timestamp: new Date(),
      }
    );

    return finalResponse;
  } catch (error) {
    console.error("Failed to run tiered agent:", error);

    // Store the error message
    await storeOptimizedMessage(
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
