/**
 * Planner Agent
 * This file contains functions for planning tasks using a simplified approach
 */

import { AgentType, Plan } from "../types";

/**
 * Create a simple plan for handling a user request
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns A structured plan
 */
export async function createPlan(projectId: string, userMessage: string): Promise<Plan> {
  // Always return a simple plan that uses the conversational agent directly
  // This avoids the complexity of creating and parsing plans
  return {
    goal: "Handle user request directly",
    requires_specialized_agents: false,
    steps: [
      {
        step_number: 1,
        description: "Process user request with conversational agent",
        agent_type: AgentType.CONVERSATIONAL,
        expected_output: "Direct response to user",
        is_api_call_required: true,
      }
    ],
    potential_issues: [],
    fallback_plan: "Use conversational agent to respond",
  };
}
