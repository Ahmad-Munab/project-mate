/**
 * Multi-Agent Orchestrator
 * This file contains functions for orchestrating the multi-agent system
 */

import { storeEnhancedMessage } from "../../memory/enhanced";
import { createPlan, executePlan } from "../agents";

/**
 * Process a user message using the multi-agent system
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
      return "I didn't receive a message. Please try again.";
    }

    console.log(`Processing message for project ${projectId}: ${userMessage}`);

    // Store the user message
    await storeEnhancedMessage(
      projectId,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }
    );

    // Create a plan
    const plan = await createPlan(projectId, userMessage);
    console.log("Plan created:", JSON.stringify(plan, null, 2));

    // Execute the plan
    const response = await executePlan(projectId, userMessage, plan);
    console.log("Response generated:", response);

    // Store the assistant's response
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
    console.error("Failed to process message:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
}

/**
 * Process a conversation using the multi-agent system
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
      return "I didn't receive a message. Please try again.";
    }

    console.log(`Processing conversation for project ${projectId}: ${userMessage}`);
    console.log("Conversation history:", JSON.stringify(conversationHistory, null, 2));

    // Store the user message
    await storeEnhancedMessage(
      projectId,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }
    );

    // Create a plan
    const plan = await createPlan(projectId, userMessage);
    console.log("Plan created:", JSON.stringify(plan, null, 2));

    // Execute the plan
    const response = await executePlan(projectId, userMessage, plan);
    console.log("Response generated:", response);

    // Store the assistant's response
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
    console.error("Failed to process conversation:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
}
