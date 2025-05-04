/**
 * Create Task Tool
 * This file implements a tool for creating tasks in a project
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createTask as createTaskBase } from "../../langchain/tools";

/**
 * Create a task in a project
 * @param projectId - The ID of the project
 * @param title - The title of the task
 * @param description - The description of the task
 * @param status - The status of the task
 * @param priority - The priority of the task
 * @param techIcons - The tech icons for the task
 * @returns The created task
 */
export async function createTask(
  projectId: string,
  title: string,
  description: string,
  status: string = "BACKLOG",
  priority: string = "MEDIUM",
  techIcons?: string[]
) {
  return createTaskBase(projectId, title, description, status, priority, techIcons);
}

/**
 * Create a tool for creating a task
 * @param projectId - The ID of the project
 * @returns A tool for creating a task
 */
export function createTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "create_task",
    description: "Create a new task in the project. Use this when the user asks to add, create, or make a task. Example: 'Create a task to implement login page'. Tech icons will be automatically suggested based on the task content, or you can specify them.",
    schema: z.object({
      title: z.string().describe("The title of the task (required, short and descriptive)"),
      description: z.string().describe("The description of the task (required, can be detailed)"),
      status: z.string().optional().describe("The status key of the task (optional, e.g., 'BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'). Use uppercase keys, not column names."),
      priority: z.string().optional().describe("The priority of the task (optional, one of: 'LOW', 'MEDIUM', 'HIGH', 'URGENT'). Use uppercase."),
      techIcons: z.array(z.string()).optional().describe("The tech icons for the task (optional, array of icon slugs from simple-icons). If not provided, icons will be automatically suggested based on the task content."),
    }),
    func: async ({ title, description, status, priority, techIcons }) => {
      try {
        // If techIcons is provided but empty, set to undefined so auto-suggestion works
        const icons = techIcons && techIcons.length === 0 ? undefined : techIcons;

        const task = await createTaskBase(
          projectId,
          title,
          description,
          status || "BACKLOG",
          priority || "MEDIUM",
          icons
        );

        if (!task) {
          return JSON.stringify({
            success: false,
            error: "Failed to create task. Please check your inputs and try again.",
          });
        }

        // Parse tech icons from the task
        let assignedIcons: string[] = [];
        if (task.tech_icons) {
          try {
            assignedIcons = typeof task.tech_icons === 'string'
              ? JSON.parse(task.tech_icons)
              : task.tech_icons;
          } catch (e) {
            console.error("Error parsing tech icons:", e);
          }
        }

        const iconMessage = assignedIcons.length > 0
          ? ` with tech icons: ${assignedIcons.join(', ')}`
          : '';

        return JSON.stringify({
          success: true,
          task,
          techIcons: assignedIcons,
          message: `Task "${title}" created successfully in ${status || "BACKLOG"} with ${priority || "MEDIUM"} priority${iconMessage}.`,
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
