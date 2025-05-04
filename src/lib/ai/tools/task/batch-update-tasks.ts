/**
 * Batch Update Tasks Tool
 * This tool allows the AI to update multiple tasks at once
 */

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { suggestTechIcons } from "./tech-icon-matcher";

/**
 * Update multiple tasks in a batch
 * @param projectId - The ID of the project
 * @param taskUpdates - Array of task updates
 * @returns The updated tasks
 */
export async function batchUpdateTasks(projectId: string, taskUpdates: Array<{
  id: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  due_date?: string | null;
}>) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    if (!Array.isArray(taskUpdates) || taskUpdates.length === 0) {
      throw new Error("Task updates are required and must not be empty");
    }

    // Get task IDs
    const taskIds = taskUpdates.map(update => update.id);

    // Verify all tasks belong to the project
    const existingTasks = await db.select()
      .from(tasks)
      .where(
        inArray(tasks.id, taskIds)
      );

    // Check if all tasks exist and belong to the project
    const foundTaskIds = existingTasks.map(task => task.id);
    const missingTaskIds = taskIds.filter(id => !foundTaskIds.includes(id));

    if (missingTaskIds.length > 0) {
      throw new Error(`Some tasks were not found or don't belong to this project: ${missingTaskIds.join(', ')}`);
    }

    // Update each task individually
    const updatedTasks = [];
    for (const update of taskUpdates) {
      const updateData: any = {
        updated_at: new Date()
      };

      if (update.title !== undefined) updateData.title = update.title;
      if (update.description !== undefined) updateData.description = update.description;
      if (update.status !== undefined) {
        updateData.status = update.status;
        updateData.status_key = update.status;
      }
      if (update.priority !== undefined) updateData.priority = update.priority;
      if (update.due_date !== undefined) {
        updateData.due_date = update.due_date ? new Date(update.due_date) : null;
      }

      // Update tech icons if title or description changed
      if (update.title !== undefined || update.description !== undefined) {
        // Get current task data
        const currentTask = existingTasks.find(t => t.id === update.id);
        if (currentTask) {
          const title = update.title || currentTask.title;
          const description = update.description !== undefined ? update.description : (currentTask.description || "");
          
          // Generate tech icons
          const techIcons = suggestTechIcons(title, description);
          updateData.tech_icons = JSON.stringify(techIcons);
          updateData.tech_icon = techIcons.length > 0 ? techIcons[0] : null;
        }
      }

      // Update the task
      const [updatedTask] = await db.update(tasks)
        .set(updateData)
        .where(eq(tasks.id, update.id))
        .returning();

      updatedTasks.push(updatedTask);
    }

    return {
      success: true,
      tasks: updatedTasks,
      message: `Updated ${updatedTasks.length} tasks successfully.`
    };
  } catch (error) {
    console.error("Error updating tasks in batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to update tasks."
    };
  }
}

/**
 * Create a tool for batch updating tasks
 * @param projectId - The ID of the project
 * @returns The batch update tasks tool
 */
export function batchUpdateTasksTool(projectId: string) {
  return {
    name: "batch_update_tasks",
    description: "Update multiple tasks at once. Useful for changing the status, priority, or other properties of multiple tasks.",
    func: async (params: { tasks: Array<{
      id: string;
      title?: string;
      description?: string;
      status?: string;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      due_date?: string | null;
    }> }) => {
      try {
        const result = await batchUpdateTasks(projectId, params.tasks);
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
