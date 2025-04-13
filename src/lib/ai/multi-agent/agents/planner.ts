/**
 * Planner Agent
 * This file contains functions for planning tasks using a specialized agent
 */

import { createSpecializedAgent } from "./agent-factory";
import { AgentType, Plan } from "../types";

/**
 * Create a plan for handling a user request
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns A structured plan
 */
export async function createPlan(projectId: string, userMessage: string): Promise<Plan> {
  try {
    // Create a planner agent
    const plannerAgent = await createSpecializedAgent(projectId, userMessage, AgentType.PLANNER);

    // Create the prompt for the planner
    const promptTemplate = `
You are a planning agent for a project management system. Your task is to create a detailed plan for handling this user request:

"${userMessage}"

First, analyze what the user is asking for. Then, create a structured plan with clear steps.
Consider whether specialized agents are needed for different parts of the task.

Return your response as a JSON object with the following structure:
{
  "goal": "The main goal to achieve",
  "requires_specialized_agents": true/false,
  "steps": [
    {
      "step_number": 1,
      "description": "Description of the step",
      "agent_type": "PLANNER/EXECUTOR/ANALYZER/CREATOR/REFLECTOR/CONVERSATIONAL",
      "expected_output": "What this step should produce",
      "is_api_call_required": true/false
    }
  ],
  "potential_issues": ["Potential issue 1", "Potential issue 2"],
  "fallback_plan": "What to do if the main plan fails"
}

Make sure to include at least 2-3 steps in your plan, and consider the most appropriate agent type for each step.
    `.trim();

    // Execute the planner agent
    const result = await plannerAgent.invoke({ input: promptTemplate });

    // Parse the result
    const planText = result.output as string;
    const planMatch = planText.match(/```json\n([\s\S]*?)\n```/) || planText.match(/```\n([\s\S]*?)\n```/) || planText.match(/{[\s\S]*?}/);
    
    if (planMatch) {
      const planJson = planMatch[0].replace(/```json\n|```\n|```/g, '');
      return JSON.parse(planJson);
    } else {
      try {
        return JSON.parse(planText);
      } catch (error) {
        console.error("Failed to parse plan:", error);
        
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
