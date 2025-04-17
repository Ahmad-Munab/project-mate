/**
 * AI Agent System
 * This file implements a proper agent architecture using Groq with LangChain
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
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
1. When the user asks you to create columns or tasks, ALWAYS use the appropriate tools to actually create them.
2. Do not just describe what you would do - actually use the tools to perform the actions.
3. NEVER show raw JSON data to the user - format your responses in a natural, conversational way.
4. After using tools, summarize what you did in a friendly, conversational manner.
5. Be proactive - if the user asks for a new column, create it using the create_column tool.
6. If the user asks for tasks, create them using the create_task tool.
7. Always use tools to take action rather than just talking about actions.
8. Respond like a helpful colleague, not a robot.
9. Keep responses concise and focused on what you actually did.

When you need to use a tool, format your response like this:
<tool>create_column</tool>
<parameters>
{
  "name": "Deployment",
  "color": "blue"
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
          const toolMatch = content.match(/<tool>(.*?)<\/tool>\s*<parameters>\s*({[\s\S]*?})\s*<\/parameters>/i);

          if (toolMatch) {
            // Extract tool name and parameters
            const toolName = toolMatch[1];
            const toolParams = JSON.parse(toolMatch[2]);

            // Find the tool
            const tool = tools.find(t => t.name === toolName);

            if (tool) {
              // Execute the tool
              console.log(`Executing tool ${toolName} with parameters:`, toolParams);
              const toolResult = await tool.invoke(toolParams);

              // Parse the tool result
              let parsedResult;
              try {
                parsedResult = JSON.parse(toolResult);
              } catch (e) {
                parsedResult = { message: toolResult };
              }

              // Generate a response that includes the tool result but in a natural way
              const followUpResponse = await model.invoke([
                systemMessage,
                { role: "user", content: userMessage },
                { role: "assistant", content: content },
                { role: "system", content: `The tool ${toolName} was executed successfully. Here's the result: ${JSON.stringify(parsedResult)}. Please respond to the user in a natural, conversational way without showing raw JSON data.` }
              ]);

              return followUpResponse.content;
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
