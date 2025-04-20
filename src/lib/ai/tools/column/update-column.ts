/**
 * Update Column Tool
 * This file implements a tool for updating columns (task statuses) in a project
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { updateTaskStatus, getTaskStatuses } from "../../langchain/tools";

/**
 * Create a tool for updating a column
 * @param projectId - The ID of the project
 * @returns A tool for updating a column
 */
export function updateColumnTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "update_column",
    description: "Update an existing column (task status). Use this when the user asks to change, edit, modify, or update a column or status. Requires columnId parameter. Example: 'Rename the Testing column to QA'.",
    schema: z.object({
      columnId: z.string().describe("The ID of the column to update (required, must be a valid column ID like '123e4567-e89b-12d3-a456-426614174000')"),
      name: z.string().optional().describe("The new name of the column (optional)"),
      color: z.string().optional().describe("The new color of the column (optional, one of: 'blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange')"),
    }),
    func: async ({ columnId, name, color }) => {
      try {
        // Ensure at least one field is being updated
        if (!name && !color) {
          return JSON.stringify({
            success: false,
            error: "At least one field (name or color) must be provided for update",
          });
        }
        
        // Get column details before updating for better feedback
        const allColumns = await getTaskStatuses(projectId);
        const columnToUpdate = allColumns.find(col => col.id === columnId);
        
        if (!columnToUpdate) {
          // List available columns to help the user
          const availableColumns = allColumns.map(col => `${col.name} (ID: ${col.id})`).join(", ");
          return JSON.stringify({
            success: false,
            error: `Column not found. Available columns: ${availableColumns}`,
          });
        }
        
        // Validate color if provided
        if (color) {
          const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange'];
          if (!validColors.includes(color.toLowerCase())) {
            return JSON.stringify({
              success: false,
              error: `Invalid color. Valid colors are: ${validColors.join(", ")}`,
            });
          }
        }
        
        const column = await updateTaskStatus(
          columnId,
          projectId,
          { 
            name, 
            color: color ? color.toLowerCase() : undefined 
          }
        );

        if (!column) {
          return JSON.stringify({
            success: false,
            error: "Failed to update column. You may not have permission to update this column.",
          });
        }

        // Create a message describing what was updated
        const updatedFields = [];
        if (name) updatedFields.push(`name to "${name}"`);
        if (color) updatedFields.push(`color to ${color.toLowerCase()}`);
        
        return JSON.stringify({
          success: true,
          column,
          message: `Column "${columnToUpdate.name}" updated successfully: ${updatedFields.join(" and ")}.`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error updating column",
        });
      }
    },
  });
}
