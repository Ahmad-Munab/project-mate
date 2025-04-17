/**
 * AI Agent System
 * This file implements a proper agent architecture using Groq with LangChain
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";
import { getAgentTools } from "./tools";
import { getEnhancedProjectContext, storeEnhancedMessage } from "../memory/enhanced";
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
  maxTokens: 2000,
};

/**
 * Create a direct agent for a project with improved tool usage
 * @param projectId - The ID of the project
 * @returns A function that can process user messages and use tools
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

    // Create the system message with improved instructions
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

IMPORTANT INSTRUCTIONS:
1. You are a TRULY AGENTIC AI - you MUST use tools to perform actions, not just describe them.
2. When the user asks you to create, update, delete, or move anything, ALWAYS use the appropriate tools.
3. For moving tasks between columns, use the move_task tool - NEVER just describe the move.
4. For creating tasks, use the create_task tool.
5. For creating columns, use the create_column tool.
6. For updating tasks or columns, use the update_task or update_column tools.
7. For deleting tasks or columns, use the delete_task or delete_column tools.
8. NEVER show raw JSON data to the user - format your responses in a natural, conversational way.
9. After using tools, summarize what you did in a friendly, conversational manner.
10. If a request requires multiple actions (like moving several tasks), use multiple tool calls in sequence.
11. Always use tools to take action rather than just talking about actions.
12. Respond like a helpful colleague, not a robot.
13. Keep responses concise and focused on what you actually did.

When you need to use a tool, format your response like this:

For creating a column:
<tool>create_column</tool>
<parameters>
{
  "name": "Deployment",
  "color": "blue"
}
</parameters>

For moving a task:
<tool>move_task</tool>
<parameters>
{
  "taskId": "task-id-here",
  "targetStatus": "BACKLOG" // Use the key of the column, e.g., 'BACKLOG', 'FRONTEND', 'BACKEND', 'DONE'
}
</parameters>

For creating a task:
<tool>create_task</tool>
<parameters>
{
  "title": "Implement feature X",
  "description": "Description of the task",
  "status": "BACKLOG",
  "priority": "MEDIUM"
}
</parameters>

Then after using the tool, respond in a natural way without showing JSON data.

Be proactive, helpful, and focused on delivering value to the user.
Respond in a natural, conversational way without showing raw JSON data to the user.
    `.trim());

    // Return a function that can process user messages and use tools
    return {
      processMessage: async (userMessage: string) => {
        try {
          // Use the model directly
          const response = await model.invoke([
            systemMessage,
            { role: "user", content: userMessage }
          ]);

          // Extract tool usage from the response
          const content = response.content as string;
          const toolMatches = Array.from(content.matchAll(/<tool>(.*?)<\/tool>\s*<parameters>\s*({[\s\S]*?})\s*<\/parameters>/gi));

          if (toolMatches.length > 0) {
            // We'll process just the first tool call for now
            // In the future, we can enhance this to process multiple tool calls

            // Process the first tool call for now (we'll enhance this later)
            const toolMatch = toolMatches[0];

            // Extract tool name and parameters
            const toolName = toolMatch[1];
            const rawParams = JSON.parse(toolMatch[2]);
            // Find the tool
            const tool = tools.find(t => t.name === toolName);

            if (tool) {
              // Create a mutable copy of the parameters and fix common naming issues
              const toolParams = { ...rawParams };

              // Fix common parameter naming issues
              if (toolName === "create_task" && 'name' in toolParams && !('title' in toolParams)) {
                // If the AI used 'name' instead of 'title', fix it
                toolParams.title = toolParams.name;
                delete toolParams.name;
                console.log("Fixed parameter naming: 'name' -> 'title'");
              }

              // Fix move_task parameter naming
              if (toolName === "move_task" && 'columnId' in toolParams && !('targetStatus' in toolParams)) {
                // If the AI used 'columnId' instead of 'targetStatus', fix it
                toolParams.targetStatus = toolParams.columnId;
                delete toolParams.columnId;
                console.log("Fixed parameter naming: 'columnId' -> 'targetStatus'");
              }

              // Execute the tool
              console.log(`Executing tool ${toolName} with parameters:`, toolParams);
              let toolResult;
              try {
                toolResult = await tool.invoke(toolParams);
              } catch (error) {
                console.error(`Error executing tool ${toolName}:`, error);
                return `I'm sorry, I encountered an error while trying to ${toolName.replace('_', ' ')}: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with different parameters.`;
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

              // Create a user-friendly message based on the tool type
              let userFriendlyMessage = '';
              if (parsedResult.success !== false) {
                switch (toolName) {
                  case 'create_task':
                    const taskTitle = parsedResult.task?.title || toolParams.title;
                    userFriendlyMessage = `I've created a new task "${taskTitle}" for you.`;
                    break;
                  case 'update_task':
                    userFriendlyMessage = `I've updated the task for you.`;
                    break;
                  case 'delete_task':
                    userFriendlyMessage = `I've deleted the task for you.`;
                    break;
                  case 'create_column':
                    const columnName = parsedResult.column?.name || toolParams.name;
                    userFriendlyMessage = `I've created a new column "${columnName}" for you.`;
                    break;
                  case 'update_column':
                    userFriendlyMessage = `I've updated the column for you.`;
                    break;
                  case 'delete_column':
                    userFriendlyMessage = `I've deleted the column for you.`;
                    break;
                  case 'move_task':
                    userFriendlyMessage = `I've moved the task to a different column for you.`;
                    break;
                  default:
                    userFriendlyMessage = `I've completed the ${toolName.replace(/_/g, ' ')} operation successfully.`;
                }
              } else {
                userFriendlyMessage = `I encountered an issue while trying to ${toolName.replace(/_/g, ' ')}: ${parsedResult.error || 'Unknown error'}.`;
              }

              // Try to get a follow-up response from the model
              let followUpContent;
              try {
                const followUpResponse = await model.invoke([
                  systemMessage,
                  { role: "user", content: userMessage },
                  { role: "assistant", content: content },
                  { role: "system", content: `${successMessage} Here's the result: ${JSON.stringify(parsedResult)}.
                  ${userFriendlyMessage}
                  Please respond to the user in a natural, conversational way without showing raw JSON data.
                  Acknowledge what you did (e.g., "I've created the task for you") and provide any relevant details or next steps.` }
                ]);
                followUpContent = followUpResponse.content;
              } catch (error) {
                console.error("Error generating follow-up response:", error);
                // If we can't get a follow-up response, use a fallback
                followUpContent = userFriendlyMessage || `I've completed the ${toolName.replace('_', ' ')} operation successfully.`;
              }

              // If the follow-up content is empty or just whitespace, use a fallback
              if (!followUpContent || typeof followUpContent === 'string' && followUpContent.trim() === '') {
                followUpContent = userFriendlyMessage || `I've completed the ${toolName.replace('_', ' ')} operation successfully.`;
              }

              return followUpContent;
            }
          }

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

    // Store the assistant message
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: typeof response === 'string' ? response : JSON.stringify(response),
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
