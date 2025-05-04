/**
 * Optimized Memory System
 * This file implements an optimized memory system for the AI assistant
 * with better performance, summarization, and intelligent storage
 */

import { createClient } from "@/utils/supabase/server";
import { useAIStore, type AIMessage } from "@/store/aiStore";
import { ChatGroq } from "@langchain/groq";
import { databaseRateLimiter } from "../utils/rate-limiter";

// Maximum number of messages to include in context
const MAX_CONTEXT_MESSAGES = 25; // Increased from 15 to 25 for better memory

// Maximum number of messages to store in database
const MAX_DB_MESSAGES = 200; // Increased from 100 to 200 for better long-term memory

// Cache for project summaries
const projectSummaryCache = new Map<string, {summary: string, timestamp: number}>();
const SUMMARY_CACHE_EXPIRATION = 10 * 60 * 1000; // 10 minutes

/**
 * Check if a message is significant enough to store in the database
 * @param message - The message to check
 * @returns Whether the message is significant
 */
function isSignificantMessage(message: AIMessage): boolean {
  // System messages are always significant
  if (message.role === 'system') return true;

  // User messages are always significant
  if (message.role === 'user') return true;

  // Assistant messages with certain keywords are significant
  if (message.role === 'assistant') {
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

    // Check for action-related keywords
    const actionKeywords = [
      'created', 'updated', 'deleted', 'moved', 'completed', 'added', 'removed',
      'task', 'column', 'project', 'status'
    ];

    for (const keyword of actionKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        return true;
      }
    }

    // Check for longer, more detailed responses
    if (content.length > 200) {
      return true;
    }
  }

  // Default to not significant
  return false;
}

/**
 * Summarize a conversation
 * @param messages - The messages to summarize
 * @returns A summary of the conversation
 */
async function summarizeConversation(messages: AIMessage[]): Promise<string> {
  // If there are few messages, no need to summarize
  if (messages.length <= 5) {
    return messages.map(m => `${m.role}: ${m.content}`).join('\n');
  }

  try {
    // Use a smaller model for summarization
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama3-8b-8192",
      temperature: 0.3,
      maxTokens: 300,
    });

    // Split messages into older and recent
    const recentMessages = messages.slice(-5);
    const olderMessages = messages.slice(0, -5);

    // Create a prompt for summarization
    const prompt = `
      Summarize the following conversation in 2-3 sentences, focusing on key points, decisions, and actions taken:

      ${olderMessages.map(m => `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n\n')}

      Provide a concise summary that captures the main topics and any actions performed.
    `;

    // Get the summary
    const response = await model.invoke(prompt);
    const summary = response.content as string;

    // Combine summary with recent messages
    return `CONVERSATION SUMMARY: ${summary}\n\nRECENT MESSAGES:\n${recentMessages.map(m => `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n\n')}`;
  } catch (error) {
    console.error("Error summarizing conversation:", error);

    // Fallback to just returning the most recent messages
    return messages.slice(-MAX_CONTEXT_MESSAGES).map(m =>
      `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
    ).join('\n\n');
  }
}

/**
 * Get a cached project summary
 * @param projectId - The ID of the project
 * @returns The cached summary or null if not found
 */
function getCachedProjectSummary(projectId: string): string | null {
  const cached = projectSummaryCache.get(projectId);

  if (cached && (Date.now() - cached.timestamp < SUMMARY_CACHE_EXPIRATION)) {
    return cached.summary;
  }

  return null;
}

/**
 * Cache a project summary
 * @param projectId - The ID of the project
 * @param summary - The summary to cache
 */
function cacheProjectSummary(projectId: string, summary: string): void {
  projectSummaryCache.set(projectId, {
    summary,
    timestamp: Date.now()
  });

  // Limit cache size
  if (projectSummaryCache.size > 50) {
    const oldestKey = [...projectSummaryCache.entries()]
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
    projectSummaryCache.delete(oldestKey);
  }
}

/**
 * Store a message in the optimized memory system
 * @param projectId - The ID of the project
 * @param message - The message to store
 * @returns Whether the message was stored successfully
 */
export async function storeOptimizedMessage(
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

    // Only store significant messages in the database
    if (isSignificantMessage(message)) {
      try {
        // Use rate limiter for database operations
        await databaseRateLimiter.enqueue(async () => {
          const supabase = await createClient();

          // Store in messages table
          await supabase
            .from('messages')
            .insert({
              project_id: projectId,
              role: message.role,
              content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
              created_at: new Date(message.timestamp).toISOString(),
              task_id: null,
              created_by: null
            });

          // Prune old messages if needed
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId);

          if (count && count > MAX_DB_MESSAGES) {
            // Delete oldest messages beyond the limit
            const { data: oldestMessages } = await supabase
              .from('messages')
              .select('id')
              .eq('project_id', projectId)
              .order('created_at', { ascending: true })
              .limit(count - MAX_DB_MESSAGES);

            if (oldestMessages && oldestMessages.length > 0) {
              const oldestIds = oldestMessages.map(m => m.id);
              await supabase
                .from('messages')
                .delete()
                .in('id', oldestIds);
            }
          }
        });
      } catch (dbError) {
        console.error("Database error storing message:", dbError);
        // Continue execution - we still have the client-side store
      }
    }

    // Invalidate summary cache when new messages are added
    projectSummaryCache.delete(projectId);

    return true;
  } catch (error) {
    console.error("Error storing optimized message:", error);
    return false;
  }
}

/**
 * Get optimized project context for the AI
 * @param projectId - The ID of the project
 * @param maxMessages - Maximum number of messages to include
 * @returns The optimized project context
 */
export async function getOptimizedProjectContext(
  projectId: string,
  maxMessages: number = MAX_CONTEXT_MESSAGES
): Promise<string> {
  try {
    // Check for cached summary first
    const cachedSummary = getCachedProjectSummary(projectId);
    if (cachedSummary) {
      return cachedSummary;
    }

    // Get messages from client-side store or database
    let messages: AIMessage[] = [];

    // Try client-side store first
    if (typeof window !== 'undefined') {
      try {
        const { getProjectMessages } = useAIStore.getState();
        const clientMessages = getProjectMessages(projectId);
        if (clientMessages && clientMessages.length > 0) {
          messages = [...clientMessages];
        }
      } catch (storeError) {
        console.error("Error getting messages from client store:", storeError);
      }
    }

    // If client-side store doesn't have messages, try the database
    if (messages.length === 0) {
      try {
        const supabase = await createClient();

        // Get messages from database
        const { data: dbMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true })
          .limit(MAX_CONTEXT_MESSAGES * 3); // Get more messages for better summarization and context

        if (!error && dbMessages && dbMessages.length > 0) {
          // Convert to AIMessage format
          messages = dbMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            id: msg.id,
            metadata: {} as Record<string, any>
          }));
        } else if (error) {
          console.error("Failed to get messages from database:", error);
        }
      } catch (dbError) {
        console.error("Database error getting messages:", dbError);
      }
    }

    // If we have enough messages, summarize them
    if (messages.length > maxMessages) {
      const summary = await summarizeConversation(messages);

      // Cache the summary
      cacheProjectSummary(projectId, summary);

      return summary;
    } else if (messages.length > 0) {
      // Just format the messages if we don't have enough to summarize
      const formattedMessages = messages.map(m =>
        `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
      ).join('\n\n');

      // Cache the formatted messages
      cacheProjectSummary(projectId, formattedMessages);

      return formattedMessages;
    }

    // If all else fails, return an empty string
    return "";
  } catch (error) {
    console.error("Error getting optimized project context:", error);
    return "";
  }
}

/**
 * Create an optimized memory system
 * @param projectId - The ID of the project
 * @returns An optimized memory system
 */
export async function createOptimizedMemory(projectId: string) {
  // Initialize with empty messages
  let messages: AIMessage[] = [];

  // Try to load messages from client-side store or database
  try {
    // Try client-side store first
    if (typeof window !== 'undefined') {
      const { getProjectMessages } = useAIStore.getState();
      const clientMessages = getProjectMessages(projectId);
      if (clientMessages && clientMessages.length > 0) {
        messages = [...clientMessages];
      }
    }

    // If client-side store doesn't have messages, try the database
    if (messages.length === 0) {
      const supabase = await createClient();

      // Get messages from database
      const { data: dbMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(MAX_CONTEXT_MESSAGES * 2); // Get more messages for better context

      if (!error && dbMessages && dbMessages.length > 0) {
        // Convert to AIMessage format
        messages = dbMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          id: msg.id,
          metadata: {} as Record<string, any>
        }));
      }
    }
  } catch (error) {
    console.error("Error initializing optimized memory:", error);
    messages = [];
  }

  return {
    /**
     * Initialize the memory system
     */
    initialize: async () => {
      // Already initialized in the constructor
    },

    /**
     * Get context based on the query
     * @param query - The query to get context for
     * @returns The context
     */
    getContext: async (query: string) => {
      return getOptimizedProjectContext(projectId);
    },

    /**
     * Add a message to the memory
     * @param role - The role of the message sender
     * @param content - The content of the message
     */
    addMessage: async (role: string, content: string): Promise<void> => {
      const message: AIMessage = {
        role: role as 'user' | 'assistant' | 'system',
        content,
        timestamp: new Date()
      };

      // Add to local messages
      messages.push(message);

      // Keep more messages in memory for better context
      if (messages.length > MAX_CONTEXT_MESSAGES * 2) {
        messages = messages.slice(-MAX_CONTEXT_MESSAGES * 2);
      }

      // Store in the optimized memory system
      await storeOptimizedMessage(projectId, message);
    }
  };
}
