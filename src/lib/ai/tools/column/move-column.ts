/**
 * Move Column Tool
 * This tool allows the AI to move a column up or down in the kanban board
 */

import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Move a column up or down in the kanban board
 * @param columnId - The ID of the column to move
 * @param projectId - The ID of the project
 * @param direction - The direction to move the column ("up" or "down")
 * @returns Result of the move operation
 */
export async function moveColumn(columnId: string, projectId: string, direction: "up" | "down") {
  try {
    if (!columnId || !projectId) {
      throw new Error("Column ID and Project ID are required");
    }

    if (!direction || (direction !== "up" && direction !== "down")) {
      throw new Error("Direction must be 'up' or 'down'");
    }

    // Get all columns for the project
    const columns = await db.select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(projectTaskStatuses.order);

    // Find the column to move
    const columnIndex = columns.findIndex(col => col.id === columnId);
    if (columnIndex === -1) {
      throw new Error("Column not found");
    }

    const column = columns[columnIndex];

    // Check if the column is a default column that shouldn't be moved
    if (column.is_default && column.key === "BACKLOG") {
      throw new Error("Cannot move the BACKLOG column");
    }

    // Calculate new positions
    let newOrder: number;
    let adjacentColumnId: string | null = null;

    if (direction === "up") {
      // Moving up (decreasing order)
      if (columnIndex === 0) {
        throw new Error("Column is already at the top");
      }
      
      newOrder = columns[columnIndex - 1].order;
      adjacentColumnId = columns[columnIndex - 1].id;
    } else {
      // Moving down (increasing order)
      if (columnIndex === columns.length - 1) {
        throw new Error("Column is already at the bottom");
      }
      
      newOrder = columns[columnIndex + 1].order;
      adjacentColumnId = columns[columnIndex + 1].id;
    }

    // Update the column's order
    const [updatedColumn] = await db.update(projectTaskStatuses)
      .set({
        order: newOrder,
        updated_at: new Date()
      })
      .where(
        and(
          eq(projectTaskStatuses.id, columnId),
          eq(projectTaskStatuses.project_id, projectId)
        )
      )
      .returning();

    // Update the adjacent column's order
    if (adjacentColumnId) {
      await db.update(projectTaskStatuses)
        .set({
          order: column.order,
          updated_at: new Date()
        })
        .where(
          and(
            eq(projectTaskStatuses.id, adjacentColumnId),
            eq(projectTaskStatuses.project_id, projectId)
          )
        );
    }

    // Get the updated columns
    const updatedColumns = await db.select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(projectTaskStatuses.order);

    return {
      success: true,
      column: updatedColumn,
      columns: updatedColumns,
      message: `Column "${column.name}" moved ${direction} successfully`
    };
  } catch (error) {
    console.error("Error moving column:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to move column"
    };
  }
}

/**
 * Create a tool for moving columns
 * @param projectId - The ID of the project
 * @returns The move column tool
 */
export function moveColumnTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "move_column",
    description: "Move a column up or down in the kanban board. Use this when the user wants to reorder columns or change their position.",
    schema: z.object({
      columnId: z.string().describe("The ID of the column to move (required)"),
      direction: z.enum(["up", "down"]).describe("The direction to move the column ('up' or 'down')"),
    }),
    func: async ({ columnId, direction }) => {
      try {
        const result = await moveColumn(columnId, projectId, direction);
        return JSON.stringify(result);
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    },
  });
}
