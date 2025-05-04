/**
 * Get Column Details Tool
 * This tool allows the AI to get detailed information about a specific column
 */

import { db } from "@/db";
import { projectTaskStatuses, tasks } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Get detailed information about a column
 * @param columnId - The ID of the column
 * @param projectId - The ID of the project
 * @returns Detailed information about the column
 */
export async function getColumnDetails(columnId: string, projectId: string) {
  try {
    if (!columnId || !projectId) {
      throw new Error("Column ID and Project ID are required");
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

    // Get the number of tasks in the column
    const [taskCount] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.project_id, projectId),
          eq(tasks.status_key, column.key)
        )
      );

    // Get the tasks in the column
    const columnTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.project_id, projectId),
          eq(tasks.status_key, column.key)
        )
      );

    // Get task counts by priority
    const [priorityCounts] = await db
      .select({
        low: count(eq(tasks.priority, "LOW")),
        medium: count(eq(tasks.priority, "MEDIUM")),
        high: count(eq(tasks.priority, "HIGH")),
        urgent: count(eq(tasks.priority, "URGENT"))
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.project_id, projectId),
          eq(tasks.status_key, column.key)
        )
      );

    return {
      success: true,
      column: {
        id: column.id,
        name: column.name,
        key: column.key,
        color: column.color,
        order: column.order,
        is_default: column.is_default,
        created_at: column.created_at,
        updated_at: column.updated_at
      },
      taskCount: taskCount?.count || 0,
      priorityCounts,
      tasks: columnTasks,
      message: `Retrieved details for column "${column.name}"`
    };
  } catch (error) {
    console.error("Error getting column details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to get column details"
    };
  }
}

/**
 * Create a tool for getting column details
 * @param projectId - The ID of the project
 * @returns The get column details tool
 */
export function getColumnDetailsTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "get_column_details",
    description: "Get detailed information about a specific column, including tasks and statistics. Use this when the user wants to know more about a particular column.",
    schema: z.object({
      columnId: z.string().describe("The ID of the column to get details for (required)"),
    }),
    func: async ({ columnId }) => {
      try {
        const result = await getColumnDetails(columnId, projectId);
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
