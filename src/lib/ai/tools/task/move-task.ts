/**
 * Move Task Tool
 * This file implements a tool for moving tasks between columns
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { moveTask, getTaskStatuses, getProjectTasks } from "../../langchain/tools";

/**
 * Create a tool for moving a task
 * @param projectId - The ID of the project
 * @returns A tool for moving a task
 */
export function moveTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "move_task",
    description: "Move a task to a different column. Use this when the user asks to move, change status, or transfer a task. Requires taskId and targetStatus parameters. Example: 'Move the login task to Done'.",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to move (required, must be a valid task ID like '123e4567-e89b-12d3-a456-426614174000')"),
      targetStatus: z.string().describe("The key of the column to move the task to (required, must be an uppercase key like 'BACKLOG', 'FRONTEND', 'BACKEND', not a column name)"),
    }),
    func: async ({ taskId, targetStatus }) => {
      try {
        console.log(`Moving task ${taskId} to status ${targetStatus} in project ${projectId}`);
        
        // Get task details before moving for better feedback
        const allTasks = await getProjectTasks(projectId);
        const taskToMove = allTasks.find(task => task.id === taskId);
        
        if (!taskToMove) {
          return JSON.stringify({
            success: false,
            error: "Task not found. Please check the task ID and try again.",
          });
        }
        
        // Get all statuses to validate the target status
        const statuses = await getTaskStatuses(projectId);
        const validStatus = statuses.find(status => 
          status.key === targetStatus || 
          status.key === targetStatus.toUpperCase()
        );
        
        if (!validStatus) {
          // Suggest valid statuses
          const validStatusNames = statuses.map(s => `${s.name} (${s.key})`).join(", ");
          return JSON.stringify({
            success: false,
            error: `Invalid target status. Valid statuses are: ${validStatusNames}`,
          });
        }
        
        // If the task is already in the target status, return early
        if (taskToMove.status_key === targetStatus) {
          return JSON.stringify({
            success: true,
            message: `Task "${taskToMove.title}" is already in the ${validStatus.name} column.`,
          });
        }
        
        const task = await moveTask(taskId, targetStatus, projectId);

        if (!task) {
          return JSON.stringify({
            success: false,
            error: "Failed to move task. Task or target column not found.",
          });
        }

        return JSON.stringify({
          success: true,
          task,
          message: `Task "${taskToMove.title}" moved successfully from ${taskToMove.status} to ${validStatus.name}.`,
        });
      } catch (error) {
        console.error("Error in move_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error moving task",
        });
      }
    },
  });
}
