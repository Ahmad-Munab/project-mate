/**
 * LangChain AI System
 * This file exports the main functions for interacting with the LangChain AI system
 */

// Export the LangChain agent
export { 
  processUserMessage,
  processSimpleMessage,
  createProjectAgent,
  createSimpleChain
} from './agent';

// Export the project creator
export { 
  generateProjectPlan,
  generateProjectStructure
} from './project-creator';

// Export memory functions
export { 
  storeEnhancedMessage,
  getProjectContext,
  createProjectMemory,
  storeMessage,
  getRecentMessages,
  storeDocument,
  searchRelevantDocuments
} from './memory';

// Export action detector
export { 
  detectAction,
  ActionType
} from './action-detector';

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
  getProjectInfo,
  getTaskStatuses,
  createTask,
  updateTask,
  deleteTask,
  getProjectTasks,
  createTaskStatus,
  updateTaskStatus,
  deleteTaskStatus,
  moveTask
} from './tools';
