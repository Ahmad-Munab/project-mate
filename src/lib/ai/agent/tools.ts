/**
 * Agent Tools
 * This file implements the tools that the agent can use
 * following proper agent architecture patterns
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  createTask,
  updateTask,
  deleteTask,
  createTaskStatus,
  updateTaskStatus,
  deleteTaskStatus,
  moveTask,
  getProjectInfo,
  getProjectTasks,
  getTaskStatuses,
} from "../langchain/tools";

/**
 * Create a tool for creating a task
 * @param projectId - The ID of the project
 * @returns A tool for creating a task
 */
export function createTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "create_task",
    description: "Create a new task in the project. Use this when the user wants to create a task.",
    schema: z.object({
      title: z.string().describe("The title of the task"),
      description: z.string().describe("The description of the task"),
      status: z.string().optional().describe("The status of the task (e.g., 'BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE')"),
      priority: z.string().optional().describe("The priority of the task (e.g., 'LOW', 'MEDIUM', 'HIGH', 'URGENT')"),
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

        return JSON.stringify({
          success: true,
          task,
          message: `Task "${title}" created successfully`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for updating a task
 * @param projectId - The ID of the project
 * @returns A tool for updating a task
 */
export function updateTaskTool(_projectId: string) {
  return new DynamicStructuredTool({
    name: "update_task",
    description: "Update an existing task. Use this when the user wants to modify a task.",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to update"),
      title: z.string().optional().describe("The new title of the task"),
      description: z.string().optional().describe("The new description of the task"),
      status: z.string().optional().describe("The new status of the task"),
      priority: z.string().optional().describe("The new priority of the task"),
    }),
    func: async ({ taskId, title, description, status, priority }) => {
      try {
        const task = await updateTask(taskId, {
          title,
          description,
          status_key: status,
          priority,
        });

        return JSON.stringify({
          success: true,
          task,
          message: `Task ${taskId} updated successfully`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for deleting a task
 * @param projectId - The ID of the project
 * @returns A tool for deleting a task
 */
export function deleteTaskTool(_projectId: string) {
  return new DynamicStructuredTool({
    name: "delete_task",
    description: "Delete a task from the project. Use this when the user wants to remove a task.",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to delete"),
    }),
    func: async ({ taskId }) => {
      try {
        await deleteTask(taskId);

        return JSON.stringify({
          success: true,
          message: `Task ${taskId} deleted successfully`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for creating a column
 * @param projectId - The ID of the project
 * @returns A tool for creating a column
 */
export function createColumnTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "create_column",
    description: "Create a new column (task status) in the project. Use this when the user wants to add a new status column.",
    schema: z.object({
      name: z.string().describe("The name of the column"),
      color: z.string().optional().describe("The color of the column (e.g., 'blue', 'green', 'red')"),
    }),
    func: async ({ name, color }) => {
      try {
        const column = await createTaskStatus(
          projectId,
          name,
          color || "blue"
        );

        return JSON.stringify({
          success: true,
          column,
          message: `Column "${name}" created successfully`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for updating a column
 * @param projectId - The ID of the project
 * @returns A tool for updating a column
 */
export function updateColumnTool(_projectId: string) {
  return new DynamicStructuredTool({
    name: "update_column",
    description: "Update an existing column (task status). Use this when the user wants to modify a column.",
    schema: z.object({
      columnId: z.string().describe("The ID of the column to update"),
      name: z.string().optional().describe("The new name of the column"),
      color: z.string().optional().describe("The new color of the column"),
    }),
    func: async ({ columnId, name, color }) => {
      try {
        const column = await updateTaskStatus(
          columnId,
          name,
          color
        );

        return JSON.stringify({
          success: true,
          column,
          message: `Column ${columnId} updated successfully`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for deleting a column
 * @param projectId - The ID of the project
 * @returns A tool for deleting a column
 */
export function deleteColumnTool(_projectId: string) {
  return new DynamicStructuredTool({
    name: "delete_column",
    description: "Delete a column (task status) from the project. Use this when the user wants to remove a column.",
    schema: z.object({
      columnId: z.string().describe("The ID of the column to delete"),
    }),
    func: async ({ columnId }) => {
      try {
        await deleteTaskStatus(columnId);

        return JSON.stringify({
          success: true,
          message: `Column ${columnId} deleted successfully`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for moving a task
 * @param projectId - The ID of the project
 * @returns A tool for moving a task
 */
export function moveTaskTool(_projectId: string) {
  return new DynamicStructuredTool({
    name: "move_task",
    description: "Move a task to a different column. Use this when the user wants to change the status of a task.",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to move"),
      columnId: z.string().describe("The ID of the column to move the task to"),
    }),
    func: async ({ taskId, columnId }) => {
      try {
        const task = await moveTask(taskId, columnId);

        return JSON.stringify({
          success: true,
          task,
          message: `Task ${taskId} moved successfully`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for getting project information
 * @param projectId - The ID of the project
 * @returns A tool for getting project information
 */
export function getProjectInfoTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "get_project_info",
    description: "Get information about the project. Use this when the user wants to know about the project.",
    schema: z.object({}),
    func: async () => {
      try {
        const info = await getProjectInfo(projectId);

        return JSON.stringify({
          success: true,
          project: info.project,
          tasks: info.tasks,
          members: info.members,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for getting project tasks
 * @param projectId - The ID of the project
 * @returns A tool for getting project tasks
 */
export function getProjectTasksTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "get_project_tasks",
    description: "Get all tasks in the project. Use this when the user wants to see all tasks.",
    schema: z.object({}),
    func: async () => {
      try {
        const tasks = await getProjectTasks(projectId);

        return JSON.stringify({
          success: true,
          tasks,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Create a tool for getting task statuses
 * @param projectId - The ID of the project
 * @returns A tool for getting task statuses
 */
export function getTaskStatusesTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "get_task_statuses",
    description: "Get all task statuses (columns) in the project. Use this when the user wants to see all columns.",
    schema: z.object({}),
    func: async () => {
      try {
        const statuses = await getTaskStatuses(projectId);

        return JSON.stringify({
          success: true,
          statuses,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * Get all tools for a project
 * @param projectId - The ID of the project
 * @returns An array of all available tools
 */
export function getAgentTools(projectId: string) {
  return [
    // Task management tools
    createTaskTool(projectId),
    updateTaskTool(projectId),
    deleteTaskTool(projectId),

    // Column management tools
    createColumnTool(projectId),
    updateColumnTool(projectId),
    deleteColumnTool(projectId),
    moveTaskTool(projectId),

    // Project information tools
    getProjectInfoTool(projectId),
    getProjectTasksTool(projectId),
    getTaskStatusesTool(projectId),
  ];
}
