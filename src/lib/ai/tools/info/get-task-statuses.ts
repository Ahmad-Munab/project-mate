/**
 * Get Task Statuses Tool
 * This file implements a tool for getting all task statuses (columns) in a project
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getTaskStatuses, getProjectTasks } from "../../langchain/tools";

/**
 * Create a tool for getting task statuses
 * @param projectId - The ID of the project
 * @returns A tool for getting task statuses
 */
export function getTaskStatusesTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "get_task_statuses",
    description: "Get all task statuses (columns) in the project. Use this when the user asks to list, show, or see all columns, statuses, or stages. Example: 'What columns do we have?'.",
    schema: z.object({}),
    func: async () => {
      try {
        const statuses = await getTaskStatuses(projectId);
        
        if (!statuses || statuses.length === 0) {
          return JSON.stringify({
            success: true,
            message: "No columns found in this project.",
            statuses: []
          });
        }
        
        // Get tasks to count tasks per status
        const tasks = await getProjectTasks(projectId);
        
        // Count tasks per status
        const statusesWithCounts = statuses.map(status => {
          const tasksInStatus = tasks.filter(task => 
            task.status_key === status.key || 
            task.status === status.key
          ).length;
          
          return {
            id: status.id,
            name: status.name,
            key: status.key,
            color: status.color,
            taskCount: tasksInStatus,
            isDefault: status.is_default
          };
        });

        return JSON.stringify({
          success: true,
          message: `Found ${statuses.length} columns in this project.`,
          statuses: statusesWithCounts,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error retrieving columns",
        });
      }
    },
  });
}
