/**
 * Executor Agent
 * This file contains functions for executing plans using specialized agents
 */

import { createSpecializedAgent } from "./agent-factory";
import { AgentType, Plan } from "../types";

/**
 * Execute a plan
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @param plan - The plan to execute
 * @returns The result of executing the plan
 */
export async function executePlan(
  projectId: string,
  userMessage: string,
  plan: Plan
): Promise<string> {
  try {
    // Simplified approach: Just use the conversational agent directly
    console.log(`Executing plan for user message: ${userMessage}`);

    // Create the agent
    const result = await createSpecializedAgent(
      projectId,
      userMessage,
      AgentType.CONVERSATIONAL
    );

    return result.output;
  } catch (error) {
    console.error("Failed to execute plan:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
}
