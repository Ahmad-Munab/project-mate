/**
 * Simple Memory System
 * This file implements a simple memory system for the AI assistant
 * to maintain conversation context without complex vector embeddings
 */

import { createClient } from "@/utils/supabase/server";
import { getOptimizedProjectContext } from "../memory/optimized-memory";

/**
 * Simple memory interface
 */
interface SimpleMemory {
  initialize: () => Promise<void>;
  getContext: (query: string) => Promise<string>;
  addMessage: (role: string, content: string) => Promise<void>;
}

/**
 * Create a simple memory system for a project
 * @param projectId - The ID of the project
 * @returns A simple memory system
 */
export async function createSimpleMemory(projectId: string): Promise<SimpleMemory> {
  // Store messages in memory
  let messages: Array<{ role: string; content: string; timestamp: Date }> = [];

  return {
    /**
     * Initialize the memory system
     */
    initialize: async () => {
      try {
        // Load recent messages from the database
        const contextString = await getOptimizedProjectContext(projectId, 10);

        // If we have context, parse it into messages
        if (contextString) {
          // Split the context string into message blocks
          const messageBlocks = contextString.split('\n\n');

          // Parse each message block
          messages = messageBlocks
            .filter(block => block.includes(':')) // Make sure it's a valid message
            .map(block => {
              // Extract role and content
              const colonIndex = block.indexOf(':');
              const role = block.substring(0, colonIndex).trim().toLowerCase();
              const content = block.substring(colonIndex + 1).trim();

              // Map roles to standard format
              const normalizedRole =
                role === 'user' || role === 'USER' ? 'user' :
                role === 'assistant' || role === 'ASSISTANT' ? 'assistant' :
                'system';

              return {
                role: normalizedRole,
                content: content,
                timestamp: new Date()
              };
            });
        }
      } catch (error) {
        console.error("Failed to initialize simple memory:", error);
        messages = [];
      }
    },

    /**
     * Get context based on the query
     * @param query - The query to get context for
     * @returns The context
     */
    getContext: async (query: string) => {
      // If we have no messages, return empty context
      if (messages.length === 0) {
        return "";
      }

      // Format messages into a readable context
      const formattedMessages = messages.map(msg => {
        const role = msg.role === 'user' ? 'User' :
                    msg.role === 'assistant' ? 'Assistant' :
                    'System';

        return `${role}: ${msg.content}`;
      }).join('\n\n');

      return formattedMessages;
    },

    /**
     * Add a message to the memory
     * @param role - The role of the message sender
     * @param content - The content of the message
     */
    addMessage: async (role: string, content: string): Promise<void> => {
      // Add message to memory
      messages.push({
        role,
        content,
        timestamp: new Date()
      });

      // Keep only the last 25 messages (increased from 10)
      if (messages.length > 25) {
        messages = messages.slice(-25);
      }
    }
  };
}
