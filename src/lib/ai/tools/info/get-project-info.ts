/**
 * Get Project Info Tool
 * This file implements a tool for getting project information
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getProjectInfo } from "../../langchain/tools";

/**
 * Create a tool for getting project information
 * @param projectId - The ID of the project
 * @returns A tool for getting project information
 */
export function getProjectInfoTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "get_project_info",
    description: "Get information about the project. Use this when the user asks about project details, overview, or general information. Example: 'Tell me about this project'.",
    schema: z.object({}),
    func: async () => {
      try {
        const info = await getProjectInfo(projectId);

        if (!info || !info.project) {
          return JSON.stringify({
            success: false,
            error: "Failed to retrieve project information. The project may not exist.",
          });
        }

        // Format the response to be more user-friendly
        const taskCount = info.tasks ? info.tasks.length : 0;
        const memberCount = info.members ? info.members.length : 0;

        // Calculate task distribution by status
        const tasksByStatus: Record<string, number> = {};
        if (info.tasks && info.tasks.length > 0) {
          info.tasks.forEach(task => {
            const status = task.status || 'Unknown';
            tasksByStatus[status] = (tasksByStatus[status] || 0) + 1;
          });
        }

        // Calculate task distribution by priority
        const tasksByPriority: Record<string, number> = {};
        if (info.tasks && info.tasks.length > 0) {
          info.tasks.forEach(task => {
            const priority = task.priority || 'Unknown';
            tasksByPriority[priority] = (tasksByPriority[priority] || 0) + 1;
          });
        }

        return JSON.stringify({
          success: true,
          project: {
            name: info.project.name,
            description: info.project.description || "No description provided",
            taskCount,
            memberCount,
            tasksByStatus,
            tasksByPriority,
            members: info.members.map(m => ({
              name: m.name,
              role: m.role
            }))
          }
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error retrieving project information",
        });
      }
    },
  });
}
