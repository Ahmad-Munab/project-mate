/**
 * Create Column Tool
 * This file implements a tool for creating columns (task statuses) in a project
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createTaskStatus } from "../../langchain/tools";

/**
 * Create a tool for creating a column
 * @param projectId - The ID of the project
 * @returns A tool for creating a column
 */
export function createColumnTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "create_column",
    description: "Create a new column (task status) in the project. Use this when the user asks to add, create, or make a new column, status, or stage. Example: 'Create a Testing column'.",
    schema: z.object({
      name: z.string().describe("The name of the column (required, should be descriptive like 'Testing' or 'In Progress')"),
      color: z.string().optional().describe("The color of the column (optional, one of: 'blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange')"),
    }),
    func: async ({ name, color }) => {
      try {
        // Validate color
        const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange'];
        const validatedColor = color && validColors.includes(color.toLowerCase()) 
          ? color.toLowerCase() 
          : 'blue';
        
        const column = await createTaskStatus(
          projectId,
          name,
          validatedColor
        );

        if (!column) {
          return JSON.stringify({
            success: false,
            error: "Failed to create column. A column with this name may already exist.",
          });
        }

        return JSON.stringify({
          success: true,
          column,
          message: `Column "${name}" created successfully with ${validatedColor} color.`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error creating column",
        });
      }
    },
  });
}
