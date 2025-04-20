/**
 * Tools Index
 * This file exports all AI tools following the single responsibility principle
 */

// Export task tools
export * from './task';

// Export column tools
export * from './column';

// Export info tools
export * from './info';

// Export project creator
export * from './project-creator';

/**
 * Get all AI tools for a project
 * @param projectId - The ID of the project
 * @returns An array of all available tools
 */
export function getAllTools(projectId: string) {
  // Import tools from their respective modules
  const { createTaskTool, updateTaskTool, deleteTaskTool, moveTaskTool } = require('./task');
  const { createColumnTool, updateColumnTool, deleteColumnTool } = require('./column');
  const { getProjectInfoTool, getProjectTasksTool, getTaskStatusesTool } = require('./info');

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
