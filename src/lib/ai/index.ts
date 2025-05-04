/**
 * AI System
 * This file exports the main functions for interacting with the AI system
 * using a proper agent architecture with tools properly connected to the agent
 * following the single responsibility principle
 */

// Export the optimized project creator
export {
  createOptimizedProject
} from './tools/project-creator/optimized-creator';

// Export the project plan generator
export {
  generateProjectPlan
} from './tools/project-creator/generate-plan';

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

// Export optimized client-side functions
export {
  initializeProjectContext,
  sendOptimizedMessage as sendMessage
} from './client/optimized-client';