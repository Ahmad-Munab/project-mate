/**
 * Reorder Columns Tool
 * This tool allows the AI to reorder the columns in a project's kanban board
 */

import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Reorder columns in a project
 * @param projectId - The ID of the project
 * @param columnOrder - Array of column IDs in the desired order
 * @returns Result of the reordering operation
 */
export async function reorderColumns(projectId: string, columnOrder: string[]) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    if (!Array.isArray(columnOrder) || columnOrder.length === 0) {
      throw new Error("Column order is required and must not be empty");
    }

    // Get all columns for the project
    const existingColumns = await db.select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(projectTaskStatuses.order);

    // Verify all columns in the order array exist
    const existingColumnIds = existingColumns.map(col => col.id);
    const invalidColumnIds = columnOrder.filter(id => !existingColumnIds.includes(id));

    if (invalidColumnIds.length > 0) {
      throw new Error(`Some columns were not found: ${invalidColumnIds.join(', ')}`);
    }

    // Check if all existing columns are included in the order
    const missingColumnIds = existingColumnIds.filter(id => !columnOrder.includes(id));
    if (missingColumnIds.length > 0) {
      throw new Error(`Some existing columns are missing from the order: ${missingColumnIds.join(', ')}`);
    }

    // Update the order of each column
    const updatedColumns = [];
    for (let i = 0; i < columnOrder.length; i++) {
      const columnId = columnOrder[i];
      const [updatedColumn] = await db.update(projectTaskStatuses)
        .set({
          order: i,
          updated_at: new Date()
        })
        .where(
          and(
            eq(projectTaskStatuses.id, columnId),
            eq(projectTaskStatuses.project_id, projectId)
          )
        )
        .returning();

      updatedColumns.push(updatedColumn);
    }

    return {
      success: true,
      columns: updatedColumns.sort((a, b) => a.order - b.order),
      message: "Columns reordered successfully"
    };
  } catch (error) {
    console.error("Error reordering columns:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to reorder columns"
    };
  }
}

/**
 * Create a tool for reordering columns
 * @param projectId - The ID of the project
 * @returns The reorder columns tool
 */
export function reorderColumnsTool(projectId: string) {
  return {
    name: "reorder_columns",
    description: "Reorder the columns in a project's kanban board. Provide an array of column IDs in the desired order.",
    func: async (params: { columnOrder: string[] }) => {
      try {
        const result = await reorderColumns(projectId, params.columnOrder);
        return JSON.stringify(result);
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  };
}
