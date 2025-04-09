/**
 * Main entry point for the AI system
 * This file exports the main functions for interacting with the AI
 */

// Export the LangChain agent
export {
  processUserMessageWithAgent as processUserMessage,
  processSimpleMessage,
  createProjectAgent,
  createSimpleChain
} from './langchain-agent';

// Export the project creator
export { generateProjectStructure } from './langchain-project-creator';

// Export memory functions
export {
  storeEnhancedMessage,
  getEnhancedProjectContext
} from './memory/enhanced';

// Export RAG functions
export {
  storeDocument,
  retrieveDocuments,
  getProjectContext
} from './rag/langchain-retrieval';

// Export action detector
export { detectAction, ActionType } from './langchain-action-detector';

// Export tools
export * from './langchain-tools';
