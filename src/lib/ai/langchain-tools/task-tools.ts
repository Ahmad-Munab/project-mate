import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  createTask,
  updateTask,
  deleteTask,
  setTaskDueDate,
  changeTaskStatus,
  changeTaskPriority,
  getProjectTasks,
  getTasksByStatus,
  getTasksByPriority,
} from "./task-api";

/**
 * Creates a tool for creating a new task
 * @param projectId - The ID of the project
 * @returns A LangChain tool for creating tasks
 */
export const createTaskTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "create_task",
    description: "Create a new task in the project",
    schema: z.object({
      title: z.string().describe("The title of the task"),
      description: z.string().describe("The description of the task"),
      status: z.string().optional().describe("The status of the task (default: BACKLOG)"),
      priority: z.string().optional().describe("The priority of the task (LOW, MEDIUM, HIGH, URGENT)"),
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
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
          },
        });
      } catch (error) {
        console.error("Error in create_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for updating an existing task
 * @param projectId - The ID of the project
 * @returns A LangChain tool for updating tasks
 */
export const updateTaskTool = (_projectId: string) =>
  new DynamicStructuredTool({
    name: "update_task",
    description: "Update an existing task in the project",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to update"),
      title: z.string().optional().describe("The new title of the task"),
      description: z.string().optional().describe("The new description of the task"),
      status: z.string().optional().describe("The new status of the task"),
      priority: z.string().optional().describe("The new priority of the task (LOW, MEDIUM, HIGH, URGENT)"),
    }),
    func: async ({ taskId, title, description, status, priority }) => {
      try {
        const task = await updateTask(taskId, {
          title,
          description,
          status,
          priority,
        });

        return JSON.stringify({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
          },
        });
      } catch (error) {
        console.error("Error in update_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for deleting a task
 * @param projectId - The ID of the project
 * @returns A LangChain tool for deleting tasks
 */
export const deleteTaskTool = (_projectId: string) =>
  new DynamicStructuredTool({
    name: "delete_task",
    description: "Delete a task from the project",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to delete"),
    }),
    func: async ({ taskId }) => {
      try {
        await deleteTask(taskId);

        return JSON.stringify({
          success: true,
          message: "Task deleted successfully",
        });
      } catch (error) {
        console.error("Error in delete_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for setting a task due date
 * @param projectId - The ID of the project
 * @returns A LangChain tool for setting task due dates
 */
export const setTaskDueDateTool = (_projectId: string) =>
  new DynamicStructuredTool({
    name: "set_task_due_date",
    description: "Set a due date for a task",
    schema: z.object({
      taskId: z.string().describe("The ID of the task"),
      dueDate: z.string().describe("The due date in ISO format (YYYY-MM-DD)"),
    }),
    func: async ({ taskId, dueDate }) => {
      try {
        const dueDateObj = dueDate ? new Date(dueDate) : null;
        const task = await setTaskDueDate(taskId, dueDateObj);

        return JSON.stringify({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            dueDate: task.due_date,
          },
        });
      } catch (error) {
        console.error("Error in set_task_due_date tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for changing a task's status
 * @param projectId - The ID of the project
 * @returns A LangChain tool for changing task statuses
 */
export const changeTaskStatusTool = (_projectId: string) =>
  new DynamicStructuredTool({
    name: "change_task_status",
    description: "Change the status of a task",
    schema: z.object({
      taskId: z.string().describe("The ID of the task"),
      status: z.string().describe("The new status of the task"),
    }),
    func: async ({ taskId, status }) => {
      try {
        const task = await changeTaskStatus(taskId, status);

        return JSON.stringify({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
          },
        });
      } catch (error) {
        console.error("Error in change_task_status tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for changing a task's priority
 * @param projectId - The ID of the project
 * @returns A LangChain tool for changing task priorities
 */
export const changeTaskPriorityTool = (_projectId: string) =>
  new DynamicStructuredTool({
    name: "change_task_priority",
    description: "Change the priority of a task",
    schema: z.object({
      taskId: z.string().describe("The ID of the task"),
      priority: z.string().describe("The new priority of the task (LOW, MEDIUM, HIGH, URGENT)"),
    }),
    func: async ({ taskId, priority }) => {
      try {
        const task = await changeTaskPriority(taskId, priority);

        return JSON.stringify({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            priority: task.priority,
          },
        });
      } catch (error) {
        console.error("Error in change_task_priority tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for getting all tasks in a project
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting project tasks
 */
export const getProjectTasksTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_project_tasks",
    description: "Get all tasks in the project",
    schema: z.object({}),
    func: async () => {
      try {
        const tasks = await getProjectTasks(projectId);

        return JSON.stringify({
          success: true,
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.due_date,
          })),
        });
      } catch (error) {
        console.error("Error in get_project_tasks tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for getting tasks by status
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting tasks by status
 */
export const getTasksByStatusTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_tasks_by_status",
    description: "Get tasks with a specific status",
    schema: z.object({
      status: z.string().describe("The status to filter by"),
    }),
    func: async ({ status }) => {
      try {
        const tasks = await getTasksByStatus(projectId, status);

        return JSON.stringify({
          success: true,
          status,
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.due_date,
          })),
        });
      } catch (error) {
        console.error("Error in get_tasks_by_status tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

/**
 * Creates a tool for getting tasks by priority
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting tasks by priority
 */
export const getTasksByPriorityTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_tasks_by_priority",
    description: "Get tasks with a specific priority",
    schema: z.object({
      priority: z.string().describe("The priority to filter by (LOW, MEDIUM, HIGH, URGENT)"),
    }),
    func: async ({ priority }) => {
      try {
        const tasks = await getTasksByPriority(projectId, priority);

        return JSON.stringify({
          success: true,
          priority,
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            dueDate: task.due_date,
          })),
        });
      } catch (error) {
        console.error("Error in get_tasks_by_priority tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
