/**
 * AI Agent System
 * This file implements a proper agent architecture using Groq with LangChain
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";
import { getAgentTools } from "./tools";
import { storeEnhancedMessage } from "../memory/enhanced";
import { getProjectInfo } from "../langchain/tools";
// No need for complex agent imports with our simplified approach

// Export tools
export { getAgentTools } from './tools';

/**
 * Configuration for the Groq model
 */
const modelConfig = {
  model: "llama3-70b-8192",
  temperature: 0.7,
  maxTokens: 1000, // Reduced token limit to save on usage
};

// Simple response cache to reduce API calls
const responseCache = new Map<string, {response: string, timestamp: number}>();

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Check if required parameters are missing for a tool
 * @param toolName - The name of the tool
 * @param params - The parameters to check
 * @returns An array of missing parameter names
 */
function checkRequiredParameters(toolName: string, params: Record<string, any>): string[] {
  const missingParams: string[] = [];

  switch (toolName) {
    case 'create_task':
      if (!params.title) missingParams.push('title');
      if (!params.description) missingParams.push('description');
      break;

    case 'update_task':
      if (!params.taskId) missingParams.push('taskId');
      // At least one update parameter is required
      if (!params.title && !params.description && !params.status && !params.priority) {
        missingParams.push('at least one of: title, description, status, or priority');
      }
      break;

    case 'delete_task':
      if (!params.taskId) missingParams.push('taskId');
      break;

    case 'create_column':
      if (!params.name) missingParams.push('name');
      break;

    case 'update_column':
      if (!params.columnId) missingParams.push('columnId');
      // At least one update parameter is required
      if (!params.name && !params.color) {
        missingParams.push('at least one of: name or color');
      }
      break;

    case 'delete_column':
      if (!params.columnId) missingParams.push('columnId');
      break;

    case 'move_task':
      if (!params.taskId) missingParams.push('taskId');
      if (!params.targetStatus) missingParams.push('targetStatus');
      break;
  }

  return missingParams;
}

/**
 * Validate and fix parameters for a tool
 * @param toolName - The name of the tool
 * @param params - The parameters to validate and fix
 */
function validateAndFixParameters(toolName: string, params: Record<string, any>): void {
  // Fix common parameter naming issues across all tools
  if ('name' in params && !('title' in params) && (toolName === 'create_task' || toolName === 'update_task')) {
    params.title = params.name;
    delete params.name;
    console.log("Fixed parameter naming: 'name' -> 'title'");
  }

  // Tool-specific parameter fixes
  switch (toolName) {
    case 'create_task':
      // Ensure status is uppercase
      if (params.status && typeof params.status === 'string') {
        params.status = params.status.toUpperCase().replace(/\s+/g, '_');
      }
      // Ensure priority is valid
      if (params.priority && typeof params.priority === 'string') {
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        params.priority = params.priority.toUpperCase();
        if (!validPriorities.includes(params.priority)) {
          params.priority = 'MEDIUM';
        }
      }
      break;

    case 'update_task':
      // Ensure status is uppercase
      if (params.status && typeof params.status === 'string') {
        params.status = params.status.toUpperCase().replace(/\s+/g, '_');
      }
      // Ensure priority is valid
      if (params.priority && typeof params.priority === 'string') {
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        params.priority = params.priority.toUpperCase();
        if (!validPriorities.includes(params.priority)) {
          params.priority = 'MEDIUM';
        }
      }
      break;

    case 'move_task':
      // Fix columnId -> targetStatus
      if ('columnId' in params && !('targetStatus' in params)) {
        params.targetStatus = params.columnId;
        delete params.columnId;
        console.log("Fixed parameter naming: 'columnId' -> 'targetStatus'");
      }
      // Fix column -> targetStatus
      if ('column' in params && !('targetStatus' in params)) {
        params.targetStatus = params.column;
        delete params.column;
        console.log("Fixed parameter naming: 'column' -> 'targetStatus'");
      }
      // Fix status -> targetStatus
      if ('status' in params && !('targetStatus' in params)) {
        params.targetStatus = params.status;
        delete params.status;
        console.log("Fixed parameter naming: 'status' -> 'targetStatus'");
      }
      // Ensure targetStatus is uppercase
      if (params.targetStatus && typeof params.targetStatus === 'string') {
        params.targetStatus = params.targetStatus.toUpperCase().replace(/\s+/g, '_');
      }
      break;

    case 'create_column':
      // Ensure color is valid
      if (params.color && typeof params.color === 'string') {
        const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange'];
        params.color = params.color.toLowerCase();
        if (!validColors.includes(params.color)) {
          params.color = 'blue';
        }
      }
      break;

    case 'update_column':
      // Ensure color is valid
      if (params.color && typeof params.color === 'string') {
        const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange'];
        params.color = params.color.toLowerCase();
        if (!validColors.includes(params.color)) {
          params.color = 'blue';
        }
      }
      break;
  }
}

/**
 * Get a cached response if available
 * @param cacheKey - The cache key
 * @returns The cached response or null
 */
function getCachedResponse(cacheKey: string): string | null {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;

  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_EXPIRATION) {
    responseCache.delete(cacheKey);
    return null;
  }

  return cached.response;
}

/**
 * Cache a response
 * @param cacheKey - The cache key
 * @param response - The response to cache
 */
function cacheResponse(cacheKey: string, response: string): void {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });

  // Limit cache size to 100 entries
  if (responseCache.size > 100) {
    // Delete oldest entry
    const oldestKey = Array.from(responseCache.keys())
      .sort((a, b) => (responseCache.get(a)?.timestamp || 0) - (responseCache.get(b)?.timestamp || 0))[0];
    if (oldestKey) responseCache.delete(oldestKey);
  }
}

/**
 * Process tool calls in the optimal order based on dependencies
 * @param toolMatches - The tool matches to process
 * @returns The tool matches in the optimal order
 */
function optimizeToolCallOrder(toolMatches: RegExpMatchArray[]): RegExpMatchArray[] {
  // If we have 0 or 1 tool calls, no need to optimize
  if (toolMatches.length <= 1) {
    return toolMatches;
  }

  // Create a copy of the tool matches
  const optimizedMatches = [...toolMatches];

  // Look for common patterns and reorder accordingly

  // Pattern 1: If creating a column and then creating a task in that column,
  // make sure the column creation happens first
  const createColumnIndex = optimizedMatches.findIndex(match => match[1] === 'create_column');
  const createTaskIndex = optimizedMatches.findIndex(match => match[1] === 'create_task');

  if (createColumnIndex !== -1 && createTaskIndex !== -1) {
    // Check if the task is using the column
    const taskParams = JSON.parse(optimizedMatches[createTaskIndex][2]);
    const columnParams = JSON.parse(optimizedMatches[createColumnIndex][2]);

    if (taskParams.status && columnParams.name) {
      // If the task status matches the column name (ignoring case and spaces),
      // make sure the column is created first
      const normalizedStatus = taskParams.status.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const normalizedColumnName = columnParams.name.replace(/[^a-z0-9]/gi, '').toLowerCase();

      if (normalizedStatus.includes(normalizedColumnName) || normalizedColumnName.includes(normalizedStatus)) {
        // Swap if needed to ensure column creation comes first
        if (createTaskIndex < createColumnIndex) {
          const temp = optimizedMatches[createTaskIndex];
          optimizedMatches[createTaskIndex] = optimizedMatches[createColumnIndex];
          optimizedMatches[createColumnIndex] = temp;
        }
      }
    }
  }

  // Pattern 2: If updating a task and then moving it, make sure the update happens first
  const updateTaskIndex = optimizedMatches.findIndex(match => match[1] === 'update_task');
  const moveTaskIndex = optimizedMatches.findIndex(match => match[1] === 'move_task');

  if (updateTaskIndex !== -1 && moveTaskIndex !== -1) {
    // Check if they're operating on the same task
    const updateParams = JSON.parse(optimizedMatches[updateTaskIndex][2]);
    const moveParams = JSON.parse(optimizedMatches[moveTaskIndex][2]);

    if (updateParams.taskId && moveParams.taskId && updateParams.taskId === moveParams.taskId) {
      // Swap if needed to ensure update comes first
      if (moveTaskIndex < updateTaskIndex) {
        const temp = optimizedMatches[moveTaskIndex];
        optimizedMatches[moveTaskIndex] = optimizedMatches[updateTaskIndex];
        optimizedMatches[updateTaskIndex] = temp;
      }
    }
  }

  return optimizedMatches;
}

/**
 * Create a direct agent for a project with improved tool usage
 * @param projectId - The ID of the project
 * @returns A function that can process user messages and use tools
 */
export async function createAgent(projectId: string) {
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

    // Log the tools to ensure they're being loaded
    console.log(`Loaded ${tools.length} tools for the agent`);

    // Create the model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
    });

    // Import enhanced prompts and tools
    const { getEnhancedBasePrompt, getEnhancedProjectContextSection, getEnhancedIntelligenceGuidelines } = await import("../prompts/enhanced-prompts");
    const { getTaskStatuses } = await import("../langchain/tools");

    // Get task statuses for context
    let taskStatuses = [];
    let columnNames = [];
    try {
      taskStatuses = await getTaskStatuses(projectId);
      columnNames = taskStatuses.map(status => status.name);
    } catch (error) {
      console.warn("Could not fetch task statuses:", error);
      // Provide default values if task statuses can't be fetched
      taskStatuses = [];
      columnNames = ["Backlog", "In Progress", "Done"];
    }

    // Load optimized system prompt template with examples of multiple tool usage and natural conversation
    const systemPromptTemplate = `
${getEnhancedBasePrompt()}

${getEnhancedProjectContextSection(projectInfo, taskStatuses, columnNames, projectContext)}

Available Tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Rules:
- Use tools for actions (create_task, move_task, etc.)
- You can and should use MULTIPLE TOOLS in sequence when needed
- Be conversational and natural in your responses
- Use contractions, varied sentence structures, and natural language
- Show personality and empathy in your responses
- Format tool calls as: <tool>name</tool><parameters>{...}</parameters>
- Never show raw JSON to users

${getEnhancedIntelligenceGuidelines()}

Examples of tool usage:

1. Creating a task:
<tool>create_task</tool>
<parameters>
{
  "title": "Implement login page",
  "description": "Create a login page with email and password fields",
  "status": "BACKLOG",
  "priority": "HIGH"
}
</parameters>

2. Moving a task:
<tool>move_task</tool>
<parameters>
{
  "taskId": "task-123",
  "targetStatus": "DONE"
}
</parameters>

3. Creating a column:
<tool>create_column</tool>
<parameters>
{
  "name": "Testing",
  "color": "purple"
}
</parameters>

4. Using multiple tools in sequence (example):
User: "Create a Testing column and then create a task for writing unit tests"

<tool>create_column</tool>
<parameters>
{
  "name": "Testing",
  "color": "purple"
}
</parameters>

<tool>create_task</tool>
<parameters>
{
  "title": "Write unit tests",
  "description": "Create comprehensive unit tests for the application",
  "status": "TESTING",
  "priority": "HIGH"
}
</parameters>
    `.trim();

    // Create the system message with optimized instructions
    const systemMessage = new SystemMessage(systemPromptTemplate);

    // Return a function that can process user messages and use tools
    return {
      processMessage: async (userMessage: string) => {
        try {
          // Generate a cache key based on the user message and project ID
          const cacheKey = `${projectId}:${userMessage.trim().toLowerCase()}`;

          // Check if we have a cached response
          const cachedResponse = getCachedResponse(cacheKey);
          if (cachedResponse) {
            console.log('Using cached response');
            return cachedResponse;
          }

          // Use the model directly
          const response = await model.invoke([
            systemMessage,
            { role: "user", content: userMessage }
          ]);

          // Extract tool usage from the response
          const content = response.content as string;
          const toolMatches = Array.from(content.matchAll(/<tool>(.*?)<\/tool>\s*<parameters>\s*({[\s\S]*?})\s*<\/parameters>/gi));

          if (toolMatches.length > 0) {
            console.log(`Found ${toolMatches.length} tool calls in the response`);

            // Process all tool calls in the optimal order
            const toolResults = [];

            // Optimize the order of tool calls based on dependencies
            const optimizedToolMatches = optimizeToolCallOrder(toolMatches);
            console.log(`Optimized ${toolMatches.length} tool calls for execution`);

            for (const toolMatch of optimizedToolMatches) {
              // Extract tool name and parameters
              const toolName = toolMatch[1];
              const rawParams = JSON.parse(toolMatch[2]);
              // Find the tool
              const tool = tools.find(t => t.name === toolName);

              if (tool) {
                // Create a mutable copy of the parameters and fix common naming issues
                const toolParams = { ...rawParams };

                // Validate and fix parameters based on tool type
                validateAndFixParameters(toolName, toolParams);

                // Log the fixed parameters
                console.log(`Validated and fixed parameters for ${toolName}:`, toolParams);

                // Execute the tool
                console.log(`Executing tool ${toolName} with parameters:`, toolParams);
                let toolResult;
                try {
                  // Check if required parameters are missing
                  const missingParams = checkRequiredParameters(toolName, toolParams);
                  if (missingParams.length > 0) {
                    const errorMsg = `Missing required parameters for ${toolName}: ${missingParams.join(', ')}`;
                    console.error(errorMsg);

                    // Create natural variations for missing parameter messages
                    const missingParamVariations = [
                      `I need a bit more information to ${toolName.replace(/_/g, ' ')}. Could you provide the ${missingParams.join(' and ')}?`,
                      `To ${toolName.replace(/_/g, ' ')}, I'll need to know the ${missingParams.join(' and ')}.`,
                      `I'm missing some details to complete that action. Can you tell me the ${missingParams.join(' and ')}?`,
                      `I'd like to help with that, but I need the ${missingParams.join(' and ')} to proceed.`,
                      `To complete this action, could you share the ${missingParams.join(' and ')} with me?`
                    ];

                    toolResults.push(missingParamVariations[Math.floor(Math.random() * missingParamVariations.length)]);
                    continue; // Skip to the next tool call
                  }

                  // Execute the tool with validated parameters
                  toolResult = await tool.invoke(toolParams);
                } catch (error) {
                  console.error(`Error executing tool ${toolName}:`, error);

                  // Provide more helpful and natural error messages based on error type
                  const errorStr = String(error);

                  // Create variations for each error type
                  const notFoundVariations = [
                    `I couldn't find the ${toolName.replace(/_/g, ' ').replace('task', 'task').replace('column', 'column')} you mentioned.`,
                    `I'm not seeing that ${toolName.includes('task') ? 'task' : toolName.includes('column') ? 'column' : 'item'} in your project.`,
                    `That ${toolName.includes('task') ? 'task' : toolName.includes('column') ? 'column' : 'item'} doesn't seem to exist.`,
                    `I couldn't locate the ${toolName.includes('task') ? 'task' : toolName.includes('column') ? 'column' : 'item'} you're referring to.`,
                    `I'm having trouble finding what you're looking for.`
                  ];

                  const permissionVariations = [
                    `I don't have permission to ${toolName.replace(/_/g, ' ')}.`,
                    `I'm not authorized to ${toolName.replace(/_/g, ' ')}.`,
                    `I don't have the necessary access to ${toolName.replace(/_/g, ' ')}.`,
                    `I'm restricted from performing that action.`,
                    `I don't have the rights to make that change.`
                  ];

                  const formatVariations = [
                    `There's an issue with the format of the parameters.`,
                    `The information provided isn't in the right format.`,
                    `I need different information to complete that action.`,
                    `The parameters you provided aren't quite right.`,
                    `I'm having trouble with the format of your request.`
                  ];

                  const generalErrorVariations = [
                    `I ran into a problem while trying to ${toolName.replace(/_/g, ' ')}: ${error instanceof Error ? error.message : 'Unknown error'}.`,
                    `Something went wrong when I tried to ${toolName.replace(/_/g, ' ')}.`,
                    `I encountered an error with that request.`,
                    `I wasn't able to complete that action successfully.`,
                    `There was an issue processing your request.`
                  ];

                  // Get a random variation based on error type
                  let errorMessage = '';
                  if (errorStr.includes('not found') || errorStr.includes('does not exist')) {
                    errorMessage = notFoundVariations[Math.floor(Math.random() * notFoundVariations.length)];
                  } else if (errorStr.includes('permission') || errorStr.includes('access')) {
                    errorMessage = permissionVariations[Math.floor(Math.random() * permissionVariations.length)];
                  } else if (errorStr.includes('invalid') || errorStr.includes('format')) {
                    errorMessage = formatVariations[Math.floor(Math.random() * formatVariations.length)];
                  } else {
                    errorMessage = generalErrorVariations[Math.floor(Math.random() * generalErrorVariations.length)];
                  }

                  // Add a helpful suggestion
                  const suggestions = [
                    "Could you try again with different details?",
                    "Would you like to try a different approach?",
                    "Let's try a different way to accomplish this.",
                    "Can you provide more information so I can help better?",
                    "Let me know if you'd like to try something else instead."
                  ];
                  const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

                  toolResults.push(`${errorMessage} ${suggestion}`);
                  continue; // Continue with the next tool call
                }

                // Parse the tool result
                let parsedResult;
                try {
                  parsedResult = JSON.parse(toolResult);
                } catch (error) {
                  console.warn("Failed to parse tool result as JSON:", error);
                  parsedResult = { message: toolResult };
                }

                // Generate a response that includes the tool result but in a natural way
                const successMessage = parsedResult.success === false
                  ? `The tool ${toolName} encountered an issue: ${parsedResult.error || 'Unknown error'}.`
                  : `The tool ${toolName} was executed successfully.`;

                // Create a user-friendly message based on the tool type with natural language variations
                let userFriendlyMessage = '';
                if (parsedResult.success !== false) {
                  // Get a random natural language variation
                  const getRandomVariation = (variations: string[]) => {
                    return variations[Math.floor(Math.random() * variations.length)];
                  };

                  switch (toolName) {
                    case 'create_task':
                      const taskTitle = parsedResult.task?.title || toolParams.title;
                      const taskStatus = parsedResult.task?.status || toolParams.status || 'BACKLOG';
                      const createTaskVariations = [
                        `I've created the "${taskTitle}" task in ${taskStatus}.`,
                        `Done! The "${taskTitle}" task is now in ${taskStatus}.`,
                        `Task "${taskTitle}" has been added to ${taskStatus}.`,
                        `Great! I've added "${taskTitle}" to your ${taskStatus} list.`,
                        `Your new task "${taskTitle}" is now in ${taskStatus}.`
                      ];
                      userFriendlyMessage = getRandomVariation(createTaskVariations);
                      break;
                    case 'update_task':
                      const updatedTaskTitle = parsedResult.task?.title || toolParams.title || 'the task';
                      const updateTaskVariations = [
                        `I've updated the "${updatedTaskTitle}" task for you.`,
                        `The "${updatedTaskTitle}" task has been modified.`,
                        `Changes to "${updatedTaskTitle}" have been saved.`,
                        `Task "${updatedTaskTitle}" is now updated with your changes.`,
                        `I've applied your changes to the "${updatedTaskTitle}" task.`
                      ];
                      userFriendlyMessage = getRandomVariation(updateTaskVariations);
                      break;
                    case 'delete_task':
                      const taskId = toolParams.taskId || 'the specified task';
                      const deleteTaskVariations = [
                        `I've removed that task for you.`,
                        `The task has been deleted.`,
                        `Task removed successfully.`,
                        `I've deleted the task as requested.`,
                        `That task is now gone from your project.`
                      ];
                      userFriendlyMessage = getRandomVariation(deleteTaskVariations);
                      break;
                    case 'create_column':
                      const columnName = parsedResult.column?.name || toolParams.name;
                      const createColumnVariations = [
                        `I've created the "${columnName}" column for you.`,
                        `New column "${columnName}" is ready to use.`,
                        `The "${columnName}" column has been added to your project.`,
                        `Done! You now have a "${columnName}" column.`,
                        `Your project now includes a "${columnName}" column.`
                      ];
                      userFriendlyMessage = getRandomVariation(createColumnVariations);
                      break;
                    case 'update_column':
                      const updatedColumnName = parsedResult.column?.name || toolParams.name || 'the column';
                      const updateColumnVariations = [
                        `I've updated the "${updatedColumnName}" column.`,
                        `The "${updatedColumnName}" column has been modified.`,
                        `Changes to the "${updatedColumnName}" column have been saved.`,
                        `The "${updatedColumnName}" column is now updated.`,
                        `I've applied your changes to the "${updatedColumnName}" column.`
                      ];
                      userFriendlyMessage = getRandomVariation(updateColumnVariations);
                      break;
                    case 'delete_column':
                      const columnId = toolParams.columnId || 'the specified column';
                      const deleteColumnVariations = [
                        `I've removed that column for you.`,
                        `The column has been deleted.`,
                        `Column removed successfully.`,
                        `I've deleted the column as requested.`,
                        `That column is now gone from your project.`
                      ];
                      userFriendlyMessage = getRandomVariation(deleteColumnVariations);
                      break;
                    case 'move_task':
                      const movedTaskTitle = parsedResult.task?.title || 'the task';
                      const targetStatus = parsedResult.task?.status || toolParams.targetStatus || 'a different column';
                      const moveTaskVariations = [
                        `I've moved "${movedTaskTitle}" to ${targetStatus}.`,
                        `The "${movedTaskTitle}" task is now in ${targetStatus}.`,
                        `Done! "${movedTaskTitle}" has been moved to ${targetStatus}.`,
                        `Task "${movedTaskTitle}" has been transferred to ${targetStatus}.`,
                        `"${movedTaskTitle}" is now located in ${targetStatus}.`
                      ];
                      userFriendlyMessage = getRandomVariation(moveTaskVariations);
                      break;
                    case 'get_project_tasks':
                      const taskCount = parsedResult.tasks?.length || 0;
                      const getTasksVariations = [
                        `I found ${taskCount} tasks in your project.`,
                        `Your project has ${taskCount} tasks.`,
                        `There are ${taskCount} tasks in this project.`,
                        `I've retrieved ${taskCount} tasks for you.`,
                        `Here are the ${taskCount} tasks in your project.`
                      ];
                      userFriendlyMessage = getRandomVariation(getTasksVariations);
                      break;
                    case 'get_task_statuses':
                      const statusCount = parsedResult.statuses?.length || 0;
                      const getStatusesVariations = [
                        `Your project has ${statusCount} columns.`,
                        `I found ${statusCount} columns in your project.`,
                        `There are ${statusCount} columns set up.`,
                        `Your project is organized into ${statusCount} columns.`,
                        `I've retrieved all ${statusCount} columns for you.`
                      ];
                      userFriendlyMessage = getRandomVariation(getStatusesVariations);
                      break;
                    default:
                      const defaultVariations = [
                        `I've completed that for you.`,
                        `Done! That action has been completed.`,
                        `I've finished the ${toolName.replace(/_/g, ' ')} operation.`,
                        `That's been taken care of.`,
                        `All done with that request!`
                      ];
                      userFriendlyMessage = getRandomVariation(defaultVariations);
                  }
                } else {
                  // Error messages with natural variations
                  const errorVariations = [
                    `Sorry, I couldn't ${toolName.replace(/_/g, ' ')}. ${parsedResult.error || 'Something went wrong.'}.`,
                    `I ran into a problem: ${parsedResult.error || 'Unknown error'}.`,
                    `There was an issue with that request: ${parsedResult.error || 'Unknown error'}.`,
                    `I wasn't able to complete that action. ${parsedResult.error || 'Unknown error'}.`,
                    `Something went wrong with that request: ${parsedResult.error || 'Unknown error'}.`
                  ];
                  userFriendlyMessage = errorVariations[Math.floor(Math.random() * errorVariations.length)];
                }

                // Add the result to our collection
                toolResults.push(userFriendlyMessage);
              }
            }

            // If we have tool results, generate a combined response
            if (toolResults.length > 0) {
              // Remove duplicate messages from tool results
              const uniqueToolResults = [...new Set(toolResults)];

              // Check if we're likely to hit a rate limit before trying to get a follow-up response
              try {
                // If we have tool results, we can just use those directly
                // This avoids making an additional API call that might hit rate limits
                if (uniqueToolResults.length > 0) {
                  // Format the tool results into a natural response
                  if (uniqueToolResults.length === 1) {
                    return uniqueToolResults[0]; // Just return the single result directly
                  } else {
                    // For multiple results, create a more natural response
                    const multipleActionsIntro = "I've completed multiple actions: ";
                    const numberedResults = uniqueToolResults.map((result, index) =>
                      `${index + 1}) ${result}`
                    ).join("\n");
                    return `${multipleActionsIntro}\n${numberedResults}`;
                  }
                }

                // Skip follow-up response generation entirely to save tokens
                // Just return the tool results directly

                // Create the final response
                let finalResponse;
                if (uniqueToolResults.length === 1) {
                  finalResponse = uniqueToolResults[0]; // Just return the single result directly
                } else {
                  // For multiple results, create a more natural response with variations
                  const multipleActionsIntros = [
                    "I've completed multiple actions for you:",
                    "Here's what I've done:",
                    "I've taken care of a few things:",
                    "I've completed these tasks for you:",
                    "Here are the actions I've completed:"
                  ];
                  const multipleActionsIntro = multipleActionsIntros[Math.floor(Math.random() * multipleActionsIntros.length)];

                  // If there are only 2 actions, use a more natural format
                  if (uniqueToolResults.length === 2) {
                    finalResponse = `${multipleActionsIntro}\n\n1) ${uniqueToolResults[0]}\n2) ${uniqueToolResults[1]}\n\nIs there anything else you'd like me to help with?`;
                  } else {
                    // For 3+ actions, use numbered list
                    const numberedResults = uniqueToolResults.map((result, index) =>
                      `${index + 1}) ${result}`
                    ).join("\n");
                    finalResponse = `${multipleActionsIntro}\n\n${numberedResults}\n\nIs there anything else you'd like me to do?`;
                  }
                }

                // Cache the response
                cacheResponse(cacheKey, finalResponse);

                return finalResponse;
              } catch (error) {
                // Check if it's a rate limit error
                const errorStr = String(error);
                if (errorStr.includes('429') || errorStr.includes('rate_limit')) {
                  console.warn("Rate limit hit, using tool results directly");
                } else {
                  console.error("Error generating follow-up response:", error);
                }

                // Use the tool results as a fallback
                if (uniqueToolResults.length === 1) {
                  return uniqueToolResults[0]; // Just return the single result directly
                } else {
                  // For multiple results, create a more natural response with variations
                  const multipleActionsIntros = [
                    "I've completed multiple actions for you:",
                    "Here's what I've done:",
                    "I've taken care of a few things:",
                    "I've completed these tasks for you:",
                    "Here are the actions I've completed:"
                  ];
                  const multipleActionsIntro = multipleActionsIntros[Math.floor(Math.random() * multipleActionsIntros.length)];

                  // If there are only 2 actions, use a more natural format
                  if (uniqueToolResults.length === 2) {
                    return `${multipleActionsIntro}\n\n1) ${uniqueToolResults[0]}\n2) ${uniqueToolResults[1]}\n\nIs there anything else you'd like me to help with?`;
                  } else {
                    // For 3+ actions, use numbered list
                    const numberedResults = uniqueToolResults.map((result, index) =>
                      `${index + 1}) ${result}`
                    ).join("\n");
                    return `${multipleActionsIntro}\n\n${numberedResults}\n\nIs there anything else you'd like me to do?`;
                  }
                }
              }
            }
          }

          // If no tool calls were processed, cache and return the original content
          cacheResponse(cacheKey, content);
          return content;
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

    // Process the message with the agent
    const response = await agent.processMessage(userMessage);

    // Ensure we have a valid response
    const finalResponse = typeof response === 'string' && response.trim() ?
      response :
      "I've processed your request, but I don't have a detailed response to provide at this moment.";

    // Store the assistant message
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: finalResponse,
        timestamp: new Date(),
      }
    );

    return finalResponse;
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
