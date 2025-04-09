/**
 * Memory system for AI assistant
 */

// Export types
export { type AIMessage, formatMessagesForAI } from './types';

// Export storage functions
export { storeMessage, getRecentMessages } from './storage';

// Export buffer memory
export { createProjectMemory } from './buffer';

// Export enhanced memory
export { storeEnhancedMessage, getEnhancedProjectContext } from './enhanced';

// Re-export for backward compatibility
export * from './enhanced';
