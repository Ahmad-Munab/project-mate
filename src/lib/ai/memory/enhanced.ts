/**
 * Enhanced Memory System
 * This file implements an enhanced memory system for the AI assistant
 * to make conversations more natural and context-aware
 */

import { createClient } from "@/utils/supabase/server";
import { useAIStore, type AIMessage } from "@/store/aiStore";

// Maximum number of messages to include in context
const MAX_CONTEXT_MESSAGES = 10;



/**
 * Store a message in the enhanced memory system
 * @param projectId - The ID of the project
 * @param message - The message to store
 * @param relatedEntityId - Optional related entity ID (task, column, etc.)
 * @returns Whether the message was stored successfully
 */
export async function storeEnhancedMessage(
  projectId: string,
  message: AIMessage,
): Promise<boolean> {
  try {
    // Store in client-side store for immediate access
    if (typeof window !== 'undefined') {
      const { addMessage } = useAIStore.getState();
      addMessage(projectId, {
        ...message,
        timestamp: new Date(message.timestamp),
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      });
    }

    try {
      // Store in database for persistence
      const supabase = await createClient();

      // Store in messages table
      const { error } = await supabase
        .from('messages')
        .insert({
          project_id: projectId,
          role: message.role,
          content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          created_at: new Date(message.timestamp).toISOString(),
          task_id: null,
          created_by: null
        });

      if (error) {
        console.error("Failed to store message in database:", error);
      }
    } catch (dbError) {
      console.error("Database error storing message:", dbError);
      // Continue execution - we still have the client-side store
    }

    return true;
  } catch (error) {
    console.error("Error storing enhanced message:", error);
    return false;
  }
}

/**
 * Get enhanced project context for the AI
 * @param projectId - The ID of the project
 * @param maxMessages - Maximum number of messages to include
 * @returns The enhanced project context
 */
export async function getEnhancedProjectContext(
  projectId: string,
  maxMessages: number = MAX_CONTEXT_MESSAGES
): Promise<AIMessage[]> {
  try {
    // Try to get messages from client-side store first
    if (typeof window !== 'undefined') {
      try {
        const { getProjectMessages } = useAIStore.getState();
        const clientMessages = getProjectMessages(projectId);
        if (clientMessages && clientMessages.length > 0) {
          return [...clientMessages].slice(-maxMessages);
        }
      } catch (storeError) {
        console.error("Error getting messages from client store:", storeError);
      }
    }

    // If client-side store doesn't have messages, try the database
    try {
      const supabase = await createClient();

      // Try to get messages from messages table
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(maxMessages);

      if (!error && messages && messages.length > 0) {
        // Convert to AIMessage format
        return messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          id: msg.id,
          metadata: {} as Record<string, any>
        })).reverse(); // Reverse to get chronological order
      }

      // If we get here, database attempt failed or returned no data
      if (error) {
        console.error("Failed to get messages from database:", error);
      }
    } catch (dbError) {
      console.error("Database error getting messages:", dbError);
    }

    // If we reach here, try to get messages from client-side store
    if (typeof window !== 'undefined') {
      try {
        const { getProjectMessages } = useAIStore.getState();
        const clientMessages = getProjectMessages(projectId);
        if (clientMessages && clientMessages.length > 0) {
          return [...clientMessages].slice(-maxMessages);
        }
      } catch (storeError) {
        console.error("Error getting messages from client store:", storeError);
      }
    }

    // If all else fails, return an empty array
    return [];
  } catch (error) {
    console.error("Error getting enhanced project context:", error);
    return [];
  }
}



// Removed unused getConversationSummary function

// Removed unused getRecentUserQuery function

// Removed unused getConversationTone function
