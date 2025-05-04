/**
 * Batch Create Columns Tool
 * This tool allows the AI to create multiple columns at once
 */

import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createTaskStatus } from "../../langchain/tools";

/**
 * Create multiple columns in a batch
 * @param projectId - The ID of the project
 * @param columns - Array of column data
 * @returns The created columns
 */
export async function batchCreateColumns(
  projectId: string,
  columns: Array<{
    name: string;
    color?: string;
  }>
) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error("Columns array is required and must not be empty");
    }

    // Get existing columns to check for duplicates and get the highest order
    const existingColumns = await db.select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(projectTaskStatuses.order);

    const maxOrder = existingColumns.length > 0
      ? Math.max(...existingColumns.map(c => c.order || 0))
      : -1;

    // Validate colors
    const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange'];

    // Create columns one by one
    const createdColumns = [];
    const errors = [];

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      
      try {
        // Validate name
        if (!column.name) {
          errors.push(`Column at index ${i} has no name`);
          continue;
        }

        // Check for duplicate names
        const key = column.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
        if (existingColumns.some(c => c.key === key)) {
          errors.push(`Column with name "${column.name}" already exists`);
          continue;
        }

        // Validate color
        const color = column.color && validColors.includes(column.color.toLowerCase())
          ? column.color.toLowerCase()
          : 'gray';

        // Create the column
        const createdColumn = await createTaskStatus(
          projectId,
          column.name,
          color
        );

        if (createdColumn) {
          createdColumns.push(createdColumn);
        } else {
          errors.push(`Failed to create column "${column.name}"`);
        }
      } catch (error) {
        errors.push(`Error creating column "${column.name}": ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return {
      success: createdColumns.length > 0,
      columns: createdColumns,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${createdColumns.length} columns${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    };
  } catch (error) {
    console.error("Error creating columns in batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to create columns"
    };
  }
}

/**
 * Create a tool for batch creating columns
 * @param projectId - The ID of the project
 * @returns The batch create columns tool
 */
export function batchCreateColumnsTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "batch_create_columns",
    description: "Create multiple columns at once. Use this when the user wants to add several columns in one go.",
    schema: z.object({
      columns: z.array(
        z.object({
          name: z.string().describe("The name of the column (required)"),
          color: z.string().optional().describe("The color of the column (optional, one of: 'blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange')"),
        })
      ).describe("Array of columns to create"),
    }),
    func: async ({ columns }) => {
      try {
        const result = await batchCreateColumns(projectId, columns);
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
