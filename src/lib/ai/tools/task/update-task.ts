/**
 * Update Task Tool
 * This file implements a tool for updating tasks in a project
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { updateTask } from "../../langchain/tools";

/**
 * Create a tool for updating a task
 * @param projectId - The ID of the project
 * @returns A tool for updating a task
 */
export function updateTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "update_task",
    description: "Update an existing task. Use this when the user asks to change, edit, modify, or update a task. Requires taskId parameter. Example: 'Update the login task description'.",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to update (required, must be a valid task ID like '123e4567-e89b-12d3-a456-426614174000')"),
      title: z.string().optional().describe("The new title of the task (optional)"),
      description: z.string().optional().describe("The new description of the task (optional)"),
      status: z.string().optional().describe("The new status key of the task (optional, must be an uppercase key like 'BACKLOG', not a column name)"),
      priority: z.string().optional().describe("The new priority of the task (optional, one of: 'LOW', 'MEDIUM', 'HIGH', 'URGENT')"),
    }),
    func: async ({ taskId, title, description, status, priority }) => {
      try {
        console.log(`Updating task ${taskId} in project ${projectId}`);
        
        // Ensure at least one field is being updated
        if (!title && !description && !status && !priority) {
          return JSON.stringify({
            success: false,
            error: "At least one field (title, description, status, or priority) must be provided for update",
          });
        }
        
        const task = await updateTask(taskId, {
          title,
          description,
          status,
          priority
        });

        if (!task) {
          return JSON.stringify({
            success: false,
            error: "Failed to update task. Task may not exist or you may not have permission to update it.",
          });
        }

        // Create a message describing what was updated
        const updatedFields = [];
        if (title) updatedFields.push("title");
        if (description) updatedFields.push("description");
        if (status) updatedFields.push("status");
        if (priority) updatedFields.push("priority");
        
        const updateMessage = `Task updated successfully: ${updatedFields.join(", ")} ${updatedFields.length > 1 ? 'were' : 'was'} changed.`;

        return JSON.stringify({
          success: true,
          task,
          message: updateMessage,
        });
      } catch (error) {
        console.error("Error in update_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error updating task",
        });
      }
    },
  });
}
