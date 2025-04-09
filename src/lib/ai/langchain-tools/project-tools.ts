import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getProjectInfo,
  updateProjectDescription,
  updateProjectReadme,
  getProjectStats,
  getTasksDueSoon,
  getOverdueTasks,
} from "../tools";

/**
 * Creates a tool for getting project information
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting project information
 */
export const getProjectInfoTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_project_info",
    description: "Get information about the project",
    schema: z.object({}),
    func: async () => {
      try {
        const info = await getProjectInfo(projectId);

        return JSON.stringify({
          success: true,
          project: {
            id: info.project.id,
            name: info.project.name,
            description: info.project.description,
            readme: info.project.readme,
            ownerId: info.project.ownerId,
            createdAt: info.project.created_at,
            updatedAt: info.project.updated_at,
          },
          taskCount: info.tasks.length,
          memberCount: info.members.length,
          statusCount: info.statuses.length,
        });
      } catch (error) {
        console.error("Error in get_project_info tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for updating the project description
 * @param projectId - The ID of the project
 * @returns A LangChain tool for updating the project description
 */
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

        return JSON.stringify({
          success: true,
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
          },
        });
      } catch (error) {
        console.error("Error in update_project_description tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for updating the project README
 * @param projectId - The ID of the project
 * @returns A LangChain tool for updating the project README
 */
export const updateProjectReadmeTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "update_project_readme",
    description: "Update the project README",
    schema: z.object({
      readme: z.string().describe("The new README content for the project"),
    }),
    func: async ({ readme }) => {
      try {
        const project = await updateProjectReadme(projectId, readme);

        return JSON.stringify({
          success: true,
          project: {
            id: project.id,
            name: project.name,
            readme: project.readme,
          },
        });
      } catch (error) {
        console.error("Error in update_project_readme tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for getting project statistics
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting project statistics
 */
export const getProjectStatsTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_project_stats",
    description: "Get statistics about the project",
    schema: z.object({}),
    func: async () => {
      try {
        const stats = await getProjectStats(projectId);

        return JSON.stringify({
          success: true,
          stats,
        });
      } catch (error) {
        console.error("Error in get_project_stats tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for getting tasks due soon
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting tasks due soon
 */
export const getTasksDueSoonTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_tasks_due_soon",
    description: "Get tasks due within a specified number of days",
    schema: z.object({
      days: z.number().optional().describe("Number of days to look ahead (default: 7)"),
    }),
    func: async ({ days }) => {
      try {
        const tasks = await getTasksDueSoon(projectId, days || 7);

        return JSON.stringify({
          success: true,
          days: days || 7,
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.due_date,
          })),
        });
      } catch (error) {
        console.error("Error in get_tasks_due_soon tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });

/**
 * Creates a tool for getting overdue tasks
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting overdue tasks
 */
export const getOverdueTasksTool = (projectId: string) =>
  new DynamicStructuredTool({
    name: "get_overdue_tasks",
    description: "Get tasks that are overdue",
    schema: z.object({}),
    func: async () => {
      try {
        const tasks = await getOverdueTasks(projectId);

        return JSON.stringify({
          success: true,
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.due_date,
          })),
        });
      } catch (error) {
        console.error("Error in get_overdue_tasks tool:", error);
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  });
