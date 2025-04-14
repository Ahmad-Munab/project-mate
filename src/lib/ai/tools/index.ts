/**
 * Tools
 * This file exports all tools
 */

// Export info tools
export * from './info';

// Export task tools
export * from './task';

// Export project tools
export * from './project';

// Export utility tools
export * from './utils';

// Export project creator
export * from './project-creator';

import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  getProjectInfoTool,
  getTaskStatusesTool,
  getProjectTasksTool,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  moveTaskTool,
  createTaskStatusTool,
  updateTaskStatusTool,
  deleteTaskStatusTool,
  searchTasksTool,
  searchTasksByDescriptionTool,
  getProjectMembersTool,
  updateProjectTool,
} from '.';

/**
 * Get all project tools
 * @param projectId - The ID of the project
 * @returns All project tools
 */
export async function getProjectTools(projectId: string): Promise<DynamicStructuredTool[]> {
  // Create all tools
  const tools = [
    // Info tools
    getProjectInfoTool(projectId),
    getTaskStatusesTool(projectId),
    getProjectTasksTool(projectId),
    searchTasksTool(projectId),
    searchTasksByDescriptionTool(projectId),
    getProjectMembersTool(projectId),
    
    // Task tools
    createTaskTool(projectId),
    updateTaskTool(projectId),
    deleteTaskTool(projectId),
    moveTaskTool(projectId),
    
    // Column tools
    createTaskStatusTool(projectId),
    updateTaskStatusTool(projectId),
    deleteTaskStatusTool(projectId),
    
    // Project tools
    updateProjectTool(projectId),
  ];
  
  // Convert to DynamicStructuredTool
  return tools.map(tool => 
    new DynamicStructuredTool({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      func: tool.func,
    })
  );
}
