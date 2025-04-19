/**
 * AI System
 * This file exports the main functions for interacting with the AI system
 * using a proper agent architecture with tools properly connected to the agent
 * following the single responsibility principle
 */

// Export the project creator
export {
  generateProjectPlan,
  generateProjectTasks,
  generateProjectDescription
} from './tools/project-creator';

// Export agent implementation
export {
  createAgent,
  runAgent,
  getAgentTools
} from './agent/index';

// Export task tools
export {
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  moveTaskTool
} from './tools/task';

// Export column tools
export {
  createColumnTool,
  updateColumnTool,
  deleteColumnTool
} from './tools/column';

// Export info tools
export {
  getProjectInfoTool,
  getProjectTasksTool,
  getTaskStatusesTool
} from './tools/info';

// Export all tools function
export {
  getAllTools
} from './tools';

// Export client-side functions
export {
  initializeProjectContext as initializeProjectContextClient,
  sendMessage
} from './client';