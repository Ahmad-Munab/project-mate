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

// Export optimized project creator
export { createOptimizedProject } from './project-creator/optimized-creator';

// Import tools directly at the module level
import {
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  moveTaskTool,
  suggestTechIconsTool,
  applyTechIconsTool,
  // New advanced task tools
  batchCreateTasksTool,
  batchUpdateTasksTool,
  assignTaskTool,
  unassignTaskTool,
  getTaskAssigneesTool,
  setTaskDueDateTool,
  searchTasksTool,
  bulkMoveTasksTool,
  suggestTaskPrioritiesTool
} from './task';

import {
  createColumnTool,
  updateColumnTool,
  deleteColumnTool,
  // Advanced column tools
  reorderColumnsTool,
  moveColumnTool,
  getColumnDetailsTool,
  setColumnColorTool,
  batchCreateColumnsTool
} from './column';

import {
  getProjectInfoTool,
  getProjectTasksTool,
  getTaskStatusesTool
} from './info';

import {
  getProjectMembersTool,
  updateProjectTool,
  addProjectMemberTool,
  removeProjectMemberTool,
  // New project tools
  generateProjectReportTool
} from './project/index';

/**
 * Get all AI tools for a project
 * @param projectId - The ID of the project
 * @returns An array of all available tools
 */
export function getAllTools(projectId: string) {
  return [
    // Basic task management tools
    createTaskTool(projectId),
    updateTaskTool(projectId),
    deleteTaskTool(projectId),
    moveTaskTool(projectId),

    // Advanced task management tools
    batchCreateTasksTool(projectId),
    batchUpdateTasksTool(projectId),
    assignTaskTool(projectId),
    unassignTaskTool(projectId),
    getTaskAssigneesTool(projectId),
    setTaskDueDateTool(projectId),
    searchTasksTool(projectId),
    bulkMoveTasksTool(projectId),
    suggestTaskPrioritiesTool(projectId),

    // Basic column management tools
    createColumnTool(projectId),
    updateColumnTool(projectId),
    deleteColumnTool(projectId),

    // Advanced column management tools
    reorderColumnsTool(projectId),
    moveColumnTool(projectId),
    getColumnDetailsTool(projectId),
    setColumnColorTool(projectId),
    batchCreateColumnsTool(projectId),

    // Project management tools
    getProjectMembersTool(projectId),
    updateProjectTool(projectId),
    addProjectMemberTool(projectId),
    removeProjectMemberTool(projectId),
    generateProjectReportTool(projectId),

    // Project information tools
    getProjectInfoTool(projectId),
    getProjectTasksTool(projectId),
    getTaskStatusesTool(projectId),

    // Tech icon tools
    suggestTechIconsTool(),
    applyTechIconsTool(),
  ];
}
