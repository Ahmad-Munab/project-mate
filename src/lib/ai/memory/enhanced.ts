/**
 * Enhanced Memory System
 * This file implements an enhanced memory system for the AI assistant
 * to make conversations more natural and context-aware
 */

import { createClient } from "@/utils/supabase/server";
import { useAIStore, type AIMessage } from "@/store/aiStore";

// Maximum number of messages to include in context
const MAX_CONTEXT_MESSAGES = 10;

// Maximum number of messages to store in the database
const MAX_STORED_MESSAGES = 100;

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
  relatedEntityId?: string
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
          metadata: null
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



/**
 * Get a summary of the recent conversation
 * @param projectId - The ID of the project
 * @param maxMessages - Maximum number of messages to include
 * @returns A summary of the recent conversation
 */
export async function getConversationSummary(
  projectId: string,
  maxMessages: number = MAX_CONTEXT_MESSAGES
): Promise<string> {
  try {
    const messages = await getEnhancedProjectContext(projectId, maxMessages);

    if (messages.length === 0) {
      return "No previous conversation.";
    }

    // Format messages into a readable summary
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'User' :
                  msg.role === 'assistant' ? 'Assistant' :
                  'System';

      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

      return `[${timestamp}] ${role}: ${content}`;
    }).join('\n\n');
  } catch (error) {
    console.error("Error getting conversation summary:", error);
    return "Error retrieving conversation history.";
  }
}

/**
 * Get the most recent user query
 * @param projectId - The ID of the project
 * @returns The most recent user query
 */
export async function getRecentUserQuery(projectId: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from('ai_messages')
      .select('content')
      .eq('project_id', projectId)
      .eq('role', 'user')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error || !messages || messages.length === 0) {
      return null;
    }

    return messages[0].content;
  } catch (error) {
    console.error("Error getting recent user query:", error);
    return null;
  }
}

/**
 * Get the conversation tone based on recent messages
 * @param projectId - The ID of the project
 * @returns The detected conversation tone
 */
export async function getConversationTone(projectId: string): Promise<'formal' | 'casual' | 'technical' | 'neutral'> {
  try {
    const messages = await getEnhancedProjectContext(projectId, 5);

    if (messages.length === 0) {
      return 'neutral';
    }

    // Extract user messages
    const userMessages = messages.filter(msg => msg.role === 'user');

    if (userMessages.length === 0) {
      return 'neutral';
    }

    // Simple tone detection based on keywords and patterns
    const combinedText = userMessages.map(msg =>
      typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    ).join(' ').toLowerCase();

    // Check for technical terms
    const technicalTerms = ['code', 'function', 'api', 'bug', 'error', 'implementation', 'database', 'algorithm'];
    const hasTechnicalTerms = technicalTerms.some(term => combinedText.includes(term));

    if (hasTechnicalTerms) {
      return 'technical';
    }

    // Check for casual language
    const casualPatterns = ['hey', 'thanks', 'cool', 'awesome', 'great', 'nice', 'yeah', 'ok', 'okay', 'sure'];
    const hasCasualPatterns = casualPatterns.some(pattern => combinedText.includes(pattern));

    if (hasCasualPatterns) {
      return 'casual';
    }

    // Check for formal language
    const formalPatterns = ['please', 'would you', 'could you', 'kindly', 'appreciate', 'request'];
    const hasFormalPatterns = formalPatterns.some(pattern => combinedText.includes(pattern));

    if (hasFormalPatterns) {
      return 'formal';
    }

    // Default to neutral
    return 'neutral';
  } catch (error) {
    console.error("Error detecting conversation tone:", error);
    return 'neutral';
  }
}
