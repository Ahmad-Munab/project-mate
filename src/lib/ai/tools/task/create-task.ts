/**
 * Create Task Tool
 * This file implements a tool for creating tasks in a project
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createTask } from "../../langchain/tools";

/**
 * Create a tool for creating a task
 * @param projectId - The ID of the project
 * @returns A tool for creating a task
 */
export function createTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "create_task",
    description: "Create a new task in the project. Use this when the user asks to add, create, or make a task. Example: 'Create a task to implement login page'.",
    schema: z.object({
      title: z.string().describe("The title of the task (required, short and descriptive)"),
      description: z.string().describe("The description of the task (required, can be detailed)"),
      status: z.string().optional().describe("The status key of the task (optional, e.g., 'BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'). Use uppercase keys, not column names."),
      priority: z.string().optional().describe("The priority of the task (optional, one of: 'LOW', 'MEDIUM', 'HIGH', 'URGENT'). Use uppercase."),
    }),
    func: async ({ title, description, status, priority }) => {
      try {
        const task = await createTask(
          projectId,
          title,
          description,
          status || "BACKLOG",
          priority || "MEDIUM"
        );

        if (!task) {
          return JSON.stringify({
            success: false,
            error: "Failed to create task. Please check your inputs and try again.",
          });
        }

        return JSON.stringify({
          success: true,
          task,
          message: `Task "${title}" created successfully in ${status || "BACKLOG"} with ${priority || "MEDIUM"} priority.`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error creating task",
        });
      }
    },
  });
}
