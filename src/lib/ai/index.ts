/**
 * AI System
 * This file exports the main functions for interacting with the AI system
 * using a proper agent architecture with tools properly connected to the agent
 */

// Export the multi-agent orchestrator
export {
  processUserMessage,
  processConversation
} from './langchain/proper-multi-agent';

// Export the project creator
export {
  generateProjectPlan,
  generateProjectTasks,
  generateProjectDescription
} from './tools/project-creator';

// Export memory functions
export {
  storeEnhancedMessage,
  getEnhancedProjectContext,
  type AIMessage
} from './memory/enhanced';

// Export project info functions
export {
  getProjectInfo,
} from './langchain/tools';

// Export new agent implementation
export {
  createAgent,
  runAgent,
  getAgentTools
} from './agent/index';

// Export tools
export {
  getProjectTools,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  createColumnTool,
  updateColumnTool,
  deleteColumnTool,
  moveTaskTool,
  getProjectInfoTool,
  getTaskStatuses,
  createTask,
  updateTask,
  deleteTask,
  getProjectTasks,
  createTaskStatus,
  updateTaskStatus,
  deleteTaskStatus,
  moveTask
} from './langchain/tools';

// Export client-side functions
export {
  initializeProjectContext as initializeProjectContextClient,
  sendMessage
} from './client';