/**
 * AI Agent System
 * This file implements a proper agent architecture using Groq with LangChain
 */

import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getAgentTools } from "./tools";
import { getEnhancedProjectContext, storeEnhancedMessage } from "../memory/enhanced";
import { getProjectInfo } from "../langchain/tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_utils";

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
 * Create a proper agent for a project that can use tools
 * @param projectId - The ID of the project
 * @returns An agent executor that can process user messages and use tools
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

    // Create the system prompt template
    const systemPrompt = PromptTemplate.fromTemplate(`
You are Mate, an intelligent AI assistant for project management.
You help users manage their projects by creating and organizing tasks, providing insights, and taking actions.

Project: {project_name}
Description: {project_description}

Project stats:
- {task_count} tasks
- {member_count} members

{project_context}

Project Tasks:
{tasks_list}

You have access to the following tools to help the user:
{tools}

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

Be proactive, helpful, and focused on delivering value to the user.
Respond in a natural, conversational way without showing raw JSON data to the user.
`);

    // Create the prompt with the project information
    const prompt = await systemPrompt.format({
      project_name: projectInfo.project.name,
      project_description: projectInfo.project.description || "No description provided",
      task_count: projectInfo.tasks?.length || 0,
      member_count: projectInfo.members?.length || 0,
      project_context: projectContext ? `Relevant context from project history:\n${projectContext}` : "",
      tasks_list: projectInfo.tasks && projectInfo.tasks.length > 0 ?
        projectInfo.tasks.map(task => `- ${task.title || 'Untitled'} (Status: ${task.status || 'Unknown'}, Priority: ${task.priority || 'Medium'})`).join('\n') :
        "No tasks yet",
      tools: tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')
    });

    // Create the agent
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      prompt: RunnableSequence.from([
        {
          input: (i: { input: string; tools: any[]; agent_scratchpad: any[] }) => i,
          tools: (i: { input: string; tools: any[]; agent_scratchpad: any[] }) => i.tools,
          agent_scratchpad: (i: { input: string; tools: any[]; agent_scratchpad: any[] }) => i.agent_scratchpad,
        },
        async (i: { input: string; tools: any[]; agent_scratchpad: any[] }) => {
          const messages = [
            new SystemMessage(prompt),
            new HumanMessage(i.input),
            ...formatToOpenAIFunctionMessages(i.agent_scratchpad),
          ];
          return messages;
        },
      ]),
    });

    // Create the agent executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      maxIterations: 5,
    });

    // Return the agent executor
    return agentExecutor;
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
    // Create the agent executor
    const agentExecutor = await createAgent(projectId);

    // Store the user message
    await storeEnhancedMessage(
      projectId,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }
    );

    // Execute the agent with the user message
    const result = await agentExecutor.invoke({
      input: userMessage,
    });

    // Extract the response
    const response = result.output;

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
