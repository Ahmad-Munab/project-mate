import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  createTask,
  updateTask,
  deleteTask,
  createTaskStatus,
  updateTaskStatus,
  deleteTaskStatus,
  getProjectTasks,
  getTaskStatuses,
  moveTask,
  getProjectInfo,
  updateProjectDescription,
} from "./tools";
import { storeEnhancedMessage } from "./enhanced-memory";
import { AIMessage } from "./memory";

// Tool to create a new task
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

        // Store the action in the memory
        await storeEnhancedMessage(
          projectId,
          {
            role: "assistant",
            content: `I've created a new task:
            
Title: ${task.title}
Description: ${task.description}
Status: ${task.status}
Priority: ${task.priority}`,
            timestamp: new Date(),
          },
          task.id
        );

        return JSON.stringify(task);
      } catch (error) {
        return `Error creating task: ${error.message}`;
      }
    },
  });

// Tool to update a task
export const updateTaskTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "update_task",
    description: "Update an existing task in the project",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to update"),
      title: z.string().optional().describe("The new title of the task"),
      description: z.string().optional().describe("The new description of the task"),
      status: z.string().optional().describe("The new status of the task"),
      priority: z.string().optional().describe("The new priority of the task (LOW, MEDIUM, HIGH, URGENT)"),
      dueDate: z.string().optional().describe("The due date of the task in ISO format (YYYY-MM-DD)"),
    }),
    func: async ({ taskId, title, description, status, priority, dueDate }) => {
      try {
        const updates: any = {};
        if (title) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status) updates.status = status;
        if (priority) updates.priority = priority;
        if (dueDate) updates.due_date = new Date(dueDate);

        const task = await updateTask(taskId, updates);

        // Store the action in the memory
        await storeEnhancedMessage(
          projectId,
          {
            role: "assistant",
            content: `I've updated the task "${task.title}".`,
            timestamp: new Date(),
          },
          task.id
        );

        return JSON.stringify(task);
      } catch (error) {
        return `Error updating task: ${error.message}`;
      }
    },
  });

// Tool to delete a task
export const deleteTaskTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "delete_task",
    description: "Delete a task from the project",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to delete"),
    }),
    func: async ({ taskId }) => {
      try {
        await deleteTask(taskId);

        // Store the action in the memory
        await storeEnhancedMessage(
          projectId,
          {
            role: "assistant",
            content: `I've deleted the task.`,
            timestamp: new Date(),
          }
        );

        return "Task deleted successfully";
      } catch (error) {
        return `Error deleting task: ${error.message}`;
      }
    },
  });

// Tool to move a task to a different status
export const moveTaskTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "move_task",
    description: "Move a task to a different status column",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to move"),
      newStatus: z.string().describe("The new status key for the task"),
    }),
    func: async ({ taskId, newStatus }) => {
      try {
        const task = await moveTask(taskId, newStatus);

        // Store the action in the memory
        await storeEnhancedMessage(
          projectId,
          {
            role: "assistant",
            content: `I've moved the task "${task.title}" to ${newStatus}.`,
            timestamp: new Date(),
          },
          task.id
        );

        return JSON.stringify(task);
      } catch (error) {
        return `Error moving task: ${error.message}`;
      }
    },
  });

// Tool to create a new task status column
export const createTaskStatusTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "create_task_status",
    description: "Create a new task status column in the project",
    schema: z.object({
      name: z.string().describe("The name of the new status column"),
      color: z.string().optional().describe("The color of the status column (CSS class)"),
    }),
    func: async ({ name, color }) => {
      try {
        const status = await createTaskStatus(
          projectId,
          name,
          color || "bg-gray-50 dark:bg-gray-900"
        );

        // Store the action in the memory
        await storeEnhancedMessage(
          projectId,
          {
            role: "assistant",
            content: `I've created a new status column "${status.name}".`,
            timestamp: new Date(),
          }
        );

        return JSON.stringify(status);
      } catch (error) {
        return `Error creating task status: ${error.message}`;
      }
    },
  });

// Tool to update a task status column
export const updateTaskStatusTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "update_task_status",
    description: "Update an existing task status column in the project",
    schema: z.object({
      statusId: z.string().describe("The ID of the status column to update"),
      name: z.string().optional().describe("The new name of the status column"),
      color: z.string().optional().describe("The new color of the status column (CSS class)"),
    }),
    func: async ({ statusId, name, color }) => {
      try {
        const updates: any = {};
        if (name) updates.name = name;
        if (color) updates.color = color;

        const status = await updateTaskStatus(statusId, updates);

        // Store the action in the memory
        await storeEnhancedMessage(
          projectId,
          {
            role: "assistant",
            content: `I've updated the status column "${status.name}".`,
            timestamp: new Date(),
          }
        );

        return JSON.stringify(status);
      } catch (error) {
        return `Error updating task status: ${error.message}`;
      }
    },
  });

// Tool to delete a task status column
export const deleteTaskStatusTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "delete_task_status",
    description: "Delete a task status column from the project",
    schema: z.object({
      statusId: z.string().describe("The ID of the status column to delete"),
    }),
    func: async ({ statusId }) => {
      try {
        await deleteTaskStatus(statusId);

        // Store the action in the memory
        await storeEnhancedMessage(
          projectId,
          {
            role: "assistant",
            content: `I've deleted the status column.`,
            timestamp: new Date(),
          }
        );

        return "Task status deleted successfully";
      } catch (error) {
        return `Error deleting task status: ${error.message}`;
      }
    },
  });

// Tool to get all tasks for a project
export const getProjectTasksTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_project_tasks",
    description: "Get all tasks for the project",
    schema: z.object({}),
    func: async () => {
      try {
        const tasks = await getProjectTasks(projectId);
        return JSON.stringify(tasks);
      } catch (error) {
        return `Error getting project tasks: ${error.message}`;
      }
    },
  });

// Tool to get all task statuses for a project
export const getTaskStatusesTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_task_statuses",
    description: "Get all task status columns for the project",
    schema: z.object({}),
    func: async () => {
      try {
        const statuses = await getTaskStatuses(projectId);
        return JSON.stringify(statuses);
      } catch (error) {
        return `Error getting task statuses: ${error.message}`;
      }
    },
  });

// Tool to get project information
export const getProjectInfoTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_project_info",
    description: "Get information about the project",
    schema: z.object({}),
    func: async () => {
      try {
        const info = await getProjectInfo(projectId);
        return JSON.stringify(info);
      } catch (error) {
        return `Error getting project info: ${error.message}`;
      }
    },
  });

// Tool to update project description
export const updateProjectDescriptionTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "update_project_description",
    description: "Update the project description",
    schema: z.object({
      description: z.string().describe("The new description for the project"),
    }),
    func: async ({ description }) => {
      try {
        const project = await updateProjectDescription(projectId, description);

        // Store the action in the memory
        await storeEnhancedMessage(
          projectId,
          {
            role: "assistant",
            content: `I've updated the project description.`,
            timestamp: new Date(),
          }
        );

        return JSON.stringify(project);
      } catch (error) {
        return `Error updating project description: ${error.message}`;
      }
    },
  });

// Get all tools for a project
export function getProjectTools(projectId: string) {
  return [
    createTaskTool(projectId),
    updateTaskTool(projectId),
    deleteTaskTool(projectId),
    moveTaskTool(projectId),
    createTaskStatusTool(projectId),
    updateTaskStatusTool(projectId),
    deleteTaskStatusTool(projectId),
    getProjectTasksTool(projectId),
    getTaskStatusesTool(projectId),
    getProjectInfoTool(projectId),
    updateProjectDescriptionTool(projectId),
  ];
}
