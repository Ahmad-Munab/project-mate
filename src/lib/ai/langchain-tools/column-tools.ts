import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  createTaskStatus,
  updateTaskStatus,
  deleteTaskStatus,
  getTaskStatuses,
  moveTask,
  reorderTaskStatuses,
} from "../tools";

/**
 * Creates a tool for creating a new task status (column)
 * @param projectId - The ID of the project
 * @returns A LangChain tool for creating task statuses
 */
export const createTaskStatusTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "create_task_status",
    description: "Create a new task status (column) in the project",
    schema: z.object({
      name: z.string().describe("The name of the status"),
      color: z.string().optional().describe("The color of the status (default: gray)"),
      position: z.number().optional().describe("The position of the status (default: last position)"),
    }),
    func: async ({ name, color, position }) => {
      try {
        const status = await createTaskStatus(
          projectId,
          name,
          color || "gray",
          position || 0
        );

        return JSON.stringify({
          success: true,
          status: {
            id: status.id,
            name: status.name,
            key: status.key,
            color: status.color,
            position: status.position,
          },
        });
      } catch (error) {
        console.error("Error in create_task_status tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for updating an existing task status (column)
 * @param projectId - The ID of the project
 * @returns A LangChain tool for updating task statuses
 */
export const updateTaskStatusTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "update_task_status",
    description: "Update an existing task status (column) in the project",
    schema: z.object({
      statusId: z.string().describe("The ID of the status to update"),
      name: z.string().optional().describe("The new name of the status"),
      color: z.string().optional().describe("The new color of the status"),
      position: z.number().optional().describe("The new position of the status"),
    }),
    func: async ({ statusId, name, color, position }) => {
      try {
        const status = await updateTaskStatus(statusId, projectId, {
          name,
          color,
          position,
        });

        return JSON.stringify({
          success: true,
          status: {
            id: status.id,
            name: status.name,
            key: status.key,
            color: status.color,
            position: status.position,
          },
        });
      } catch (error) {
        console.error("Error in update_task_status tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for deleting a task status (column)
 * @param projectId - The ID of the project
 * @returns A LangChain tool for deleting task statuses
 */
export const deleteTaskStatusTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "delete_task_status",
    description: "Delete a task status (column) from the project",
    schema: z.object({
      statusId: z.string().describe("The ID of the status to delete"),
      moveTasksTo: z.string().optional().describe("The ID of the status to move tasks to (optional)"),
    }),
    func: async ({ statusId, moveTasksTo }) => {
      try {
        await deleteTaskStatus(statusId, projectId, moveTasksTo);

        return JSON.stringify({
          success: true,
          message: "Task status deleted successfully",
        });
      } catch (error) {
        console.error("Error in delete_task_status tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for getting all task statuses (columns)
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting task statuses
 */
export const getTaskStatusesTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_task_statuses",
    description: "Get all task statuses (columns) in the project",
    schema: z.object({}),
    func: async () => {
      try {
        const statuses = await getTaskStatuses(projectId);

        return JSON.stringify({
          success: true,
          statuses: statuses.map(status => ({
            id: status.id,
            name: status.name,
            key: status.key,
            color: status.color,
            position: status.position,
          })),
        });
      } catch (error) {
        console.error("Error in get_task_statuses tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for moving a task to a different status (column)
 * @param projectId - The ID of the project
 * @returns A LangChain tool for moving tasks
 */
export const moveTaskTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "move_task",
    description: "Move a task to a different status (column)",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to move"),
      statusId: z.string().describe("The ID of the status to move the task to"),
    }),
    func: async ({ taskId, statusId }) => {
      try {
        const task = await moveTask(taskId, projectId, statusId);

        return JSON.stringify({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
          },
        });
      } catch (error) {
        console.error("Error in move_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for reordering task statuses (columns)
 * @param projectId - The ID of the project
 * @returns A LangChain tool for reordering task statuses
 */
export const reorderTaskStatusesTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "reorder_task_statuses",
    description: "Reorder task statuses (columns) in the project",
    schema: z.object({
      statusIds: z.array(z.string()).describe("An array of status IDs in the desired order"),
    }),
    func: async ({ statusIds }) => {
      try {
        const statuses = await reorderTaskStatuses(projectId, statusIds);

        return JSON.stringify({
          success: true,
          statuses: statuses.map(status => ({
            id: status.id,
            name: status.name,
            position: status.position,
          })),
        });
      } catch (error) {
        console.error("Error in reorder_task_statuses tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });
