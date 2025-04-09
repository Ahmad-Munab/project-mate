/**
 * LangChain Agent Implementation
 * This file implements a proper LangChain agent using the tools we've defined
 */

import { ChatGroq } from "@langchain/groq";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { BufferMemory } from "langchain/memory";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatMessagesForAI } from "./memory/types";
import { createProjectMemory } from "./memory/buffer";
import { getProjectTools } from "./langchain-tools";
import { getEnhancedProjectContext } from "./memory/enhanced";
import { storeEnhancedMessage } from "./memory/enhanced";

/**
 * Create a LangChain agent for a project
 * @param projectId - The ID of the project
 * @returns A LangChain agent executor
 */
export async function createProjectAgent(projectId: string) {
  try {
    // Get project memory
    const memory = await createProjectMemory(projectId);
    
    // Get project tools
    const tools = getProjectTools(projectId);
    
    // Get project context
    const projectContext = await getEnhancedProjectContext(projectId, "");
    
    // Create the model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama3-70b-8192",
      temperature: 0.7,
    });
    
    // Create the system message
    const systemMessage = new SystemMessage(`
You are Mate, an intelligent AI assistant for project management.
You help users manage their projects by creating and organizing tasks, providing insights, and taking actions.

${projectContext ? `Project Context:\n${projectContext}\n\n` : ""}

You have access to tools that allow you to:
- Create, update, and delete tasks
- Create, update, and delete columns (task statuses)
- Move tasks between columns
- Get information about the project and its tasks
- Generate suggestions, summaries, and analyses

Be proactive, helpful, and focused on delivering value to the user.
Use the most appropriate tool for each request.
    `.trim());
    
    // Create the agent
    const agent = await createOpenAIFunctionsAgent({
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
    });
    
    return agentExecutor;
  } catch (error) {
    console.error("Failed to create project agent:", error);
    throw error;
  }
}

/**
 * Process a user message using the LangChain agent
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The agent's response
 */
export async function processUserMessageWithAgent(projectId: string, userMessage: string) {
  try {
    // Create the agent
    const agentExecutor = await createProjectAgent(projectId);
    
    // Store the user message
    await storeEnhancedMessage(projectId, {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });
    
    // Run the agent
    const result = await agentExecutor.invoke({
      input: userMessage,
    });
    
    // Store the assistant message
    await storeEnhancedMessage(projectId, {
      role: "assistant",
      content: result.output,
      timestamp: new Date(),
    });
    
    return result.output;
  } catch (error) {
    console.error("Error processing message with agent:", error);
    return "I encountered an error while processing your message.";
  }
}

/**
 * Create a simple chain for processing messages without tools
 * @param projectId - The ID of the project
 * @returns A runnable sequence
 */
export async function createSimpleChain(projectId: string) {
  try {
    // Get project context
    const projectContext = await getEnhancedProjectContext(projectId, "");
    
    // Create the model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama3-70b-8192",
      temperature: 0.7,
    });
    
    // Create the system message
    const systemMessage = new SystemMessage(`
You are Mate, an intelligent AI assistant for project management.
You help users manage their projects by providing insights and answering questions.

${projectContext ? `Project Context:\n${projectContext}\n\n` : ""}

Be helpful, concise, and focused on delivering value to the user.
    `.trim());
    
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
    // Create the chain
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
