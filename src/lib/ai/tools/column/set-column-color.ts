/**
 * Set Column Color Tool
 * This tool allows the AI to set or change the color of a column
 */

import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Set the color of a column
 * @param columnId - The ID of the column
 * @param projectId - The ID of the project
 * @param color - The color to set
 * @returns Result of the operation
 */
export async function setColumnColor(columnId: string, projectId: string, color: string) {
  try {
    if (!columnId || !projectId) {
      throw new Error("Column ID and Project ID are required");
    }

    if (!color) {
      throw new Error("Color is required");
    }

    // Validate color
    const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange'];
    if (!validColors.includes(color.toLowerCase())) {
      throw new Error(`Invalid color. Valid colors are: ${validColors.join(", ")}`);
    }

    // Get the column
    const [column] = await db.select()
      .from(projectTaskStatuses)
      .where(
        and(
          eq(projectTaskStatuses.id, columnId),
          eq(projectTaskStatuses.project_id, projectId)
        )
      );

    if (!column) {
      throw new Error("Column not found");
    }

    // Update the column color
    const [updatedColumn] = await db.update(projectTaskStatuses)
      .set({
        color: color.toLowerCase(),
        updated_at: new Date()
      })
      .where(
        and(
          eq(projectTaskStatuses.id, columnId),
          eq(projectTaskStatuses.project_id, projectId)
        )
      )
      .returning();

    return {
      success: true,
      column: updatedColumn,
      message: `Column "${column.name}" color updated to ${color.toLowerCase()}`
    };
  } catch (error) {
    console.error("Error setting column color:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to set column color"
    };
  }
}

/**
 * Create a tool for setting column colors
 * @param projectId - The ID of the project
 * @returns The set column color tool
 */
export function setColumnColorTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "set_column_color",
    description: "Set or change the color of a column. Use this when the user wants to change a column's color.",
    schema: z.object({
      columnId: z.string().describe("The ID of the column to update (required)"),
      color: z.string().describe("The color to set (required, one of: 'blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange')"),
    }),
    func: async ({ columnId, color }) => {
      try {
        const result = await setColumnColor(columnId, projectId, color);
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
