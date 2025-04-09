// Export all LangChain tools

// Task management tools
export {
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  setTaskDueDateTool,
  changeTaskStatusTool,
  changeTaskPriorityTool,
  getProjectTasksTool,
  getTasksByStatusTool,
  getTasksByPriorityTool,
} from './task-tools';

// Column management tools
export {
  createTaskStatusTool,
  updateTaskStatusTool,
  deleteTaskStatusTool,
  getTaskStatusesTool,
  moveTaskTool,
  reorderTaskStatusesTool,
} from './column-tools';

// Project management tools
export {
  getProjectInfoTool,
  updateProjectDescriptionTool,
  updateProjectReadmeTool,
  getProjectStatsTool,
  getTasksDueSoonTool,
  getOverdueTasksTool,
} from './project-tools';

// AI tools
export {
  generateTaskSuggestionsTool,
  generateProjectSummaryTool,
  analyzeProjectProgressTool,
  generateProjectRoadmapTool,
} from './ai-tools';

/**
 * Gets all tools for a project
 * @param projectId - The ID of the project
 * @returns An array of all available tools
 */
export function getProjectTools(projectId: string) {
  return [
    // Task management tools
    createTaskTool(projectId),
    updateTaskTool(projectId),
    deleteTaskTool(projectId),
    setTaskDueDateTool(projectId),
    changeTaskStatusTool(projectId),
    changeTaskPriorityTool(projectId),
    getProjectTasksTool(projectId),
    getTasksByStatusTool(projectId),
    getTasksByPriorityTool(projectId),
    
    // Column management tools
    createTaskStatusTool(projectId),
    updateTaskStatusTool(projectId),
    deleteTaskStatusTool(projectId),
    getTaskStatusesTool(projectId),
    moveTaskTool(projectId),
    reorderTaskStatusesTool(projectId),
    
    // Project management tools
    getProjectInfoTool(projectId),
    updateProjectDescriptionTool(projectId),
    updateProjectReadmeTool(projectId),
    getProjectStatsTool(projectId),
    getTasksDueSoonTool(projectId),
    getOverdueTasksTool(projectId),
    
    // AI tools
    generateTaskSuggestionsTool(projectId),
    generateProjectSummaryTool(projectId),
    analyzeProjectProgressTool(projectId),
    generateProjectRoadmapTool(projectId),
  ];
}
