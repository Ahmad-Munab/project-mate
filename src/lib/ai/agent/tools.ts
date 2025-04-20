/**
 * Agent Tools
 * This file implements the tools that the agent can use
 * following proper agent architecture patterns
 */

// Import tools from their respective modules
import { createTaskTool, updateTaskTool, deleteTaskTool, moveTaskTool } from '../tools/task';
import { createColumnTool, updateColumnTool, deleteColumnTool } from '../tools/column';
import { getProjectInfoTool, getProjectTasksTool, getTaskStatusesTool } from '../tools/info';



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
    moveTaskTool(projectId),

    // Column management tools
    createColumnTool(projectId),
    updateColumnTool(projectId),
    deleteColumnTool(projectId),

    // Project information tools
    getProjectInfoTool(projectId),
    getProjectTasksTool(projectId),
    getTaskStatusesTool(projectId),
  ];
}
