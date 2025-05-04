/**
 * Optimized AI Client
 * This file implements an optimized client for interacting with the AI assistant
 * with better performance, error handling, and user experience
 */

import { toast } from "sonner";
import { processToolCalls } from "./tool-processor";

// Response type
export interface AIResponse {
  message: string;
  timestamp: Date;
  error?: boolean;
  rateLimit?: boolean;
  optimized?: boolean;
}

// Request timeout (45 seconds)
const REQUEST_TIMEOUT = 45000;

/**
 * Initialize project context for the AI
 * @param projectId - The ID of the project
 * @returns Whether initialization was successful
 */
export async function initializeProjectContext(projectId: string): Promise<boolean> {
  if (!projectId) {
    console.error("Project ID is required");
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch('/api/ai/context/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId, optimized: true }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to initialize project context: ${response.status} ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error initializing project context:", error);
    return false;
  }
}

/**
 * Send a message to the optimized AI
 * @param projectId - The ID of the project
 * @param message - The message to send
 * @param abortSignal - Optional AbortSignal for cancellation
 * @returns The AI's response
 */
export async function sendOptimizedMessage(
  projectId: string,
  message: string,
  abortSignal?: AbortSignal
): Promise<AIResponse> {
  if (!projectId || !message.trim()) {
    return {
      message: 'Project ID and message are required.',
      timestamp: new Date(),
      error: true,
    };
  }

  try {
    // Use the optimized API endpoint
    const endpoint = '/api/ai/optimized';

    // Create controller for timeout if no signal provided
    let controller: AbortController | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    if (!abortSignal) {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        message,
      }),
      signal: abortSignal || controller?.signal,
    });

    // Clear timeout if we created one
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      // Handle rate limit errors
      if (response.status === 429) {
        return {
          message: 'I\'m currently experiencing high demand. Please try again in a moment.',
          timestamp: new Date(),
          error: true,
          rateLimit: true,
        };
      }

      const errorText = await response.text();
      throw new Error(`Failed to send message: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Process any tool calls in the response
    if (data.message && typeof data.message === 'string') {
      // Check if the message contains tool calls
      if (data.message.includes("<tool>") && data.message.includes("</tool>")) {
        console.log("Found tool calls in response, processing...");
        data.message = await processToolCalls(data.message, projectId);
      }
    }

    return {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending optimized message:', errorMessage);

    // Handle specific error types
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        message: 'The request took too long to process. Please try a shorter message or try again later.',
        timestamp: new Date(),
        error: true,
      };
    }

    // Check for rate limit errors
    const errorStr = String(error);
    if (errorStr.includes('429') || errorStr.includes('rate_limit')) {
      return {
        message: 'Rate limit reached. Please try again in a few minutes or use a shorter message.',
        timestamp: new Date(),
        error: true,
        rateLimit: true,
      };
    }

    return {
      message: 'Sorry, I encountered an error while processing your message. Please try again.',
      timestamp: new Date(),
      error: true,
    };
  }
}

/**
 * Perform an action with the optimized AI
 * @param projectId - The ID of the project
 * @param action - The action to perform
 * @returns The AI's response
 */
export async function performOptimizedAction(
  projectId: string,
  action: string
): Promise<AIResponse> {
  if (!projectId || !action.trim()) {
    return {
      message: 'Project ID and action are required.',
      timestamp: new Date(),
      error: true,
    };
  }

  try {
    // Show loading toast
    const toastId = toast.loading('Performing action...');

    // Use the optimized API endpoint
    const endpoint = '/api/ai/optimized';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        message: action,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    toast.dismiss(toastId);

    if (!response.ok) {
      // Handle rate limit errors
      if (response.status === 429) {
        toast.error('Rate limit reached. Please try again in a few minutes.');
        return {
          message: 'I\'m currently experiencing high demand. Please try again in a moment.',
          timestamp: new Date(),
          error: true,
          rateLimit: true,
        };
      }

      const errorText = await response.text();
      throw new Error(`Failed to perform action: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Process any tool calls in the response
    if (data.message && typeof data.message === 'string') {
      // Check if the message contains tool calls
      if (data.message.includes("<tool>") && data.message.includes("</tool>")) {
        console.log("Found tool calls in action response, processing...");
        data.message = await processToolCalls(data.message, projectId);
      }
    }

    toast.success('Action completed successfully!');

    return {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error performing optimized action:', errorMessage);

    toast.error('Failed to perform action. Please try again.');

    // Handle specific error types
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        message: 'The action took too long to process. Please try a simpler action or try again later.',
        timestamp: new Date(),
        error: true,
      };
    }

    // Check for rate limit errors
    const errorStr = String(error);
    if (errorStr.includes('429') || errorStr.includes('rate_limit')) {
      return {
        message: 'Rate limit reached. Please try again in a few minutes or use a simpler action.',
        timestamp: new Date(),
        error: true,
        rateLimit: true,
      };
    }

    return {
      message: 'Sorry, I encountered an error while performing this action. Please try again.',
      timestamp: new Date(),
      error: true,
    };
  }
}
