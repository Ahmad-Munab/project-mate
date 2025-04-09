import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  generateTaskSuggestions,
  generateProjectSummary,
  analyzeProjectProgress,
  generateProjectRoadmap,
} from "./ai-functions";

/**
 * Creates a tool for generating task suggestions
 * @param projectId - The ID of the project
 * @returns A LangChain tool for generating task suggestions
 */
export const generateTaskSuggestionsTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "generate_task_suggestions",
    description: "Generate suggestions for new tasks based on the project context",
    schema: z.object({
      count: z.number().optional().describe("Number of tasks to suggest (default: 3)"),
      context: z.string().optional().describe("Additional context for task generation"),
    }),
    func: async ({ count, context }) => {
      try {
        const suggestions = await generateTaskSuggestions(
          projectId,
          count || 3,
          context || ""
        );

        return JSON.stringify({
          success: true,
          suggestions,
        });
      } catch (error) {
        console.error("Error in generate_task_suggestions tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for generating a project summary
 * @param projectId - The ID of the project
 * @returns A LangChain tool for generating a project summary
 */
export const generateProjectSummaryTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "generate_project_summary",
    description: "Generate a summary of the project",
    schema: z.object({}),
    func: async () => {
      try {
        const summary = await generateProjectSummary(projectId);

        return JSON.stringify({
          success: true,
          summary,
        });
      } catch (error) {
        console.error("Error in generate_project_summary tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for analyzing project progress
 * @param projectId - The ID of the project
 * @returns A LangChain tool for analyzing project progress
 */
export const analyzeProjectProgressTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "analyze_project_progress",
    description: "Analyze the progress of the project",
    schema: z.object({}),
    func: async () => {
      try {
        const analysis = await analyzeProjectProgress(projectId);

        return JSON.stringify({
          success: true,
          analysis,
        });
      } catch (error) {
        console.error("Error in analyze_project_progress tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for generating a project roadmap
 * @param projectId - The ID of the project
 * @returns A LangChain tool for generating a project roadmap
 */
export const generateProjectRoadmapTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "generate_project_roadmap",
    description: "Generate a roadmap for the project",
    schema: z.object({
      timeframe: z.string().optional().describe("The timeframe for the roadmap (e.g., '2 weeks', '3 months')"),
    }),
    func: async ({ timeframe }) => {
      try {
        const roadmap = await generateProjectRoadmap(
          projectId,
          timeframe || "1 month"
        );

        return JSON.stringify({
          success: true,
          timeframe: timeframe || "1 month",
          roadmap,
        });
      } catch (error) {
        console.error("Error in generate_project_roadmap tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
