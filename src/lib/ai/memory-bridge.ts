/**
 * Bridge file to maintain backward compatibility
 */

// Re-export from memory module
export { storeEnhancedMessage, getEnhancedProjectContext } from './memory/enhanced';
export type { AIMessage } from './memory/types';
