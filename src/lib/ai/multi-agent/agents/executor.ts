/**
 * Executor Agent
 * This file contains functions for executing plans using specialized agents
 */

import { createSpecializedAgent } from "./agent-factory";
import { AgentType, Plan, AgentResult } from "../types";
import { LLMCache } from "../../tools/utils";

// Cache for LLM responses to reduce API calls
const llmCache = new LLMCache();

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
    let finalResponse = "";
    const intermediateResults: Record<string, unknown> = {};

    // Execute each step in the plan
    for (const step of plan.steps) {
      console.log(`Executing step ${step.step_number}: ${step.description} with ${step.agent_type} agent`);

      // Check if we have a cached result for this step
      const cacheKey = `${projectId}_${userMessage}_${step.description}`;
      const cachedResult = llmCache.get(cacheKey);

      if (cachedResult) {
        console.log(`Using cached result for step ${step.step_number}`);
        intermediateResults[`step_${step.step_number}`] = cachedResult;
        continue;
      }

      // Create the appropriate agent for this step
      const agent = await createSpecializedAgent(
        projectId,
        userMessage,
        step.agent_type as AgentType
      );

      // Create the input for this step, including results from previous steps
      const stepInput = `
Step ${step.step_number}: ${step.description}

User message: "${userMessage}"

${Object.keys(intermediateResults).length > 0 ? `Results from previous steps:\n${JSON.stringify(intermediateResults, null, 2)}` : ""}

Your task: ${step.expected_output}
      `.trim();

      // Execute the step
      if (step.is_api_call_required) {
        try {
          const stepResult = await agent.invoke({ input: stepInput });
          intermediateResults[`step_${step.step_number}`] = stepResult.output;

          // Cache the result
          llmCache.set(cacheKey, stepResult.output);
        } catch (error) {
          console.error(`Error executing step ${step.step_number}:`, error);
          intermediateResults[`step_${step.step_number}`] = `Skipped API call for: ${step.description}`;
        }
      } else {
        intermediateResults[`step_${step.step_number}`] = `Skipped API call for: ${step.description}`;
      }
    }

    // Generate the final response
    if (plan.steps.length > 0) {
      // Use the result of the last step as the final response
      const lastStepKey = `step_${plan.steps[plan.steps.length - 1].step_number}`;

      // Create a summary of all steps
      const stepSummary = `
Here's what I did to handle your request:

${Object.entries(intermediateResults).map(([step, result]) => `${step}: ${result}`).join('\n\n')}
      `.trim();

      // Use the last step's result as the final response, or generate a summary
      if (plan.steps.length === 1) {
        finalResponse = intermediateResults[lastStepKey] || "I've processed your request, but I'm not sure how to respond.";
      } else {
        finalResponse = stepSummary;
      }
    } else {
      finalResponse = "I couldn't create a plan to handle your request. Please try again with more details.";
    }

    return finalResponse;
  } catch (error) {
    console.error("Failed to execute plan:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
}
