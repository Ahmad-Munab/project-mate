/**
 * Task Status Tools
 * This file contains functions for getting task statuses
 */

import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Get task statuses
 * @param projectId - The ID of the project
 * @returns Task statuses
 */
export async function getTaskStatuses(projectId: string) {
  try {
    // Get the task statuses
    const statuses = await db
      .select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId));

    return statuses;
  } catch (error) {
    console.error("Failed to get task statuses:", error);
    throw error;
  }
}

/**
 * Get task statuses tool
 * @returns A tool for getting task statuses
 */
export function getTaskStatusesTool(projectId: string) {
  return {
    name: "get_task_statuses",
    description: "Get the available task statuses (columns) for the project. Use this when you need to know what statuses are available.",
    schema: z.object({}),
    func: async () => {
      try {
        const statuses = await getTaskStatuses(projectId);
        return statuses;
      } catch (error) {
        console.error("Failed to get task statuses:", error);
        return { error: "Failed to get task statuses" };
      }
    },
  };
}

/**
 * Create a task status
 * @param projectId - The ID of the project
 * @param name - The name of the status
 * @param color - The color of the status
 * @param key - The key of the status
 * @returns The created task status
 */
export async function createTaskStatus(
  projectId: string,
  name: string,
  color: string,
  key: string
) {
  try {
    // Create the task status
    const [status] = await db
      .insert(projectTaskStatuses)
      .values({
        project_id: projectId,
        name,
        color,
        key,
        order: 0, // Default order
      })
      .returning();

    return status;
  } catch (error) {
    console.error("Failed to create task status:", error);
    throw error;
  }
}

/**
 * Create task status tool
 * @param projectId - The ID of the project
 * @returns A tool for creating a task status
 */
export function createTaskStatusTool(projectId: string) {
  return {
    name: "create_task_status",
    description: "Create a new task status (column) in the project. Use this when the user wants to add a new column.",
    schema: z.object({
      name: z.string().describe("The name of the status"),
      color: z.string().describe("The color of the status (e.g., 'blue', 'green', 'red')"),
    }),
    func: async ({ name, color }: { name: string; color: string }) => {
      try {
        // Generate a key from the name
        const key = name.toUpperCase().replace(/\s+/g, "_");
        
        // Create the task status
        const status = await createTaskStatus(projectId, name, color, key);
        
        return status;
      } catch (error) {
        console.error("Failed to create task status:", error);
        return { error: "Failed to create task status" };
      }
    },
  };
}

/**
 * Update a task status
 * @param statusId - The ID of the status
 * @param name - The name of the status
 * @param color - The color of the status
 * @returns The updated task status
 */
export async function updateTaskStatus(
  statusId: string,
  name?: string,
  color?: string
) {
  try {
    // Update the task status
    const [status] = await db
      .update(projectTaskStatuses)
      .set({
        name: name,
        color: color,
      })
      .where(eq(projectTaskStatuses.id, statusId))
      .returning();

    return status;
  } catch (error) {
    console.error("Failed to update task status:", error);
    throw error;
  }
}

/**
 * Update task status tool
 * @param projectId - The ID of the project
 * @returns A tool for updating a task status
 */
export function updateTaskStatusTool(projectId: string) {
  return {
    name: "update_task_status",
    description: "Update an existing task status (column) in the project. Use this when the user wants to modify a column.",
    schema: z.object({
      statusId: z.string().describe("The ID of the status to update"),
      name: z.string().optional().describe("The new name of the status"),
      color: z.string().optional().describe("The new color of the status (e.g., 'blue', 'green', 'red')"),
    }),
    func: async ({ statusId, name, color }: { statusId: string; name?: string; color?: string }) => {
      try {
        // Update the task status
        const status = await updateTaskStatus(statusId, name, color);
        
        return status;
      } catch (error) {
        console.error("Failed to update task status:", error);
        return { error: "Failed to update task status" };
      }
    },
  };
}

/**
 * Delete a task status
 * @param statusId - The ID of the status
 * @returns The deleted task status
 */
export async function deleteTaskStatus(statusId: string) {
  try {
    // Delete the task status
    const [status] = await db
      .delete(projectTaskStatuses)
      .where(eq(projectTaskStatuses.id, statusId))
      .returning();

    return status;
  } catch (error) {
    console.error("Failed to delete task status:", error);
    throw error;
  }
}

/**
 * Delete task status tool
 * @param projectId - The ID of the project
 * @returns A tool for deleting a task status
 */
export function deleteTaskStatusTool(projectId: string) {
  return {
    name: "delete_task_status",
    description: "Delete a task status (column) from the project. Use this when the user wants to remove a column.",
    schema: z.object({
      statusId: z.string().describe("The ID of the status to delete"),
    }),
    func: async ({ statusId }: { statusId: string }) => {
      try {
        // Delete the task status
        const status = await deleteTaskStatus(statusId);
        
        return status;
      } catch (error) {
        console.error("Failed to delete task status:", error);
        return { error: "Failed to delete task status" };
      }
    },
  };
}
