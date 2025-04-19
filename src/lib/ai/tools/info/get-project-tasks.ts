/**
 * Get Project Tasks Tool
 * This file implements a tool for getting all tasks in a project
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getProjectTasks } from "../../langchain/tools";

/**
 * Create a tool for getting project tasks
 * @param projectId - The ID of the project
 * @returns A tool for getting project tasks
 */
export function getProjectTasksTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "get_project_tasks",
    description: "Get all tasks in the project. Use this when the user asks to list, show, or see all tasks, or asks what tasks exist. Example: 'Show me all tasks'.",
    schema: z.object({
      status: z.string().optional().describe("Filter tasks by status (optional, e.g., 'BACKLOG', 'IN_PROGRESS', 'DONE')"),
      priority: z.string().optional().describe("Filter tasks by priority (optional, e.g., 'LOW', 'MEDIUM', 'HIGH', 'URGENT')"),
    }),
    func: async ({ status, priority }) => {
      try {
        let tasks = await getProjectTasks(projectId);

        if (!tasks || tasks.length === 0) {
          return JSON.stringify({
            success: true,
            message: "No tasks found in this project.",
            tasks: []
          });
        }

        // Apply filters if provided
        if (status) {
          const statusUpper = status.toUpperCase();
          tasks = tasks.filter(task => 
            task.status_key === statusUpper || 
            task.status === statusUpper
          );
        }
        
        if (priority) {
          const priorityUpper = priority.toUpperCase();
          tasks = tasks.filter(task => task.priority === priorityUpper);
        }
        
        // Format tasks for better readability
        const formattedTasks = tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          created_at: task.created_at,
          due_date: task.due_date
        }));

        // Create a summary message
        let message = `Found ${tasks.length} tasks`;
        if (status) message += ` with status ${status}`;
        if (priority) message += `${status ? ' and' : ' with'} priority ${priority}`;
        message += '.';

        return JSON.stringify({
          success: true,
          message,
          tasks: formattedTasks,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error retrieving tasks",
        });
      }
    },
  });
}
