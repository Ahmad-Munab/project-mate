/**
 * Delete Column Tool
 * This file implements a tool for deleting columns (task statuses) in a project
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { deleteTaskStatus as deleteTaskStatusBase, getTaskStatuses as getTaskStatusesBase } from "../../langchain/tools";

/**
 * Delete a task status (column)
 * @param statusId - The ID of the status to delete
 * @param projectId - The ID of the project
 * @param moveTasksTo - The ID of the status to move tasks to
 * @returns True if the status was deleted
 */
export async function deleteTaskStatus(
  statusId: string,
  projectId: string,
  moveTasksTo?: string
) {
  return deleteTaskStatusBase(statusId, projectId, moveTasksTo);
}

/**
 * Create a tool for deleting a column
 * @param projectId - The ID of the project
 * @returns A tool for deleting a column
 */
export function deleteColumnTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "delete_column",
    description: "Delete a column (task status) from the project. Use this when the user asks to remove, delete, or get rid of a column or status. Requires columnId parameter. Example: 'Delete the Testing column'.",
    schema: z.object({
      columnId: z.string().describe("The ID of the column to delete (required, must be a valid column ID like '123e4567-e89b-12d3-a456-426614174000')"),
      moveTasksTo: z.string().optional().describe("The ID of the column to move tasks to (optional, must be a valid column ID)"),
    }),
    func: async ({ columnId, moveTasksTo }) => {
      try {
        // Get column details before deleting for better feedback
        const allColumns = await getTaskStatusesBase(projectId);
        const columnToDelete = allColumns.find(col => col.id === columnId);

        if (!columnToDelete) {
          // List available columns to help the user
          const availableColumns = allColumns.map(col => `${col.name} (ID: ${col.id})`).join(", ");
          return JSON.stringify({
            success: false,
            error: `Column not found. Available columns: ${availableColumns}`,
          });
        }

        // Check if this is a default column that shouldn't be deleted
        if (columnToDelete.is_default) {
          return JSON.stringify({
            success: false,
            error: `Cannot delete the default column "${columnToDelete.name}". This column is required for the project.`,
          });
        }

        // If moveTasksTo is provided, validate it
        if (moveTasksTo) {
          const targetColumn = allColumns.find(col => col.id === moveTasksTo);
          if (!targetColumn) {
            return JSON.stringify({
              success: false,
              error: `Target column for moving tasks not found. Please provide a valid column ID.`,
            });
          }
        }

        await deleteTaskStatusBase(columnId, projectId, moveTasksTo);

        const moveMessage = moveTasksTo
          ? ` Tasks were moved to ${allColumns.find(col => col.id === moveTasksTo)?.name || "another column"}.`
          : "";

        return JSON.stringify({
          success: true,
          message: `Column "${columnToDelete.name}" deleted successfully.${moveMessage}`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error deleting column",
        });
      }
    },
  });
}
