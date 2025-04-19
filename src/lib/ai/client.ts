/**
 * Client-side AI functions
 * This file contains optimized functions for interacting with the AI system from the client side
 */

import { toast } from "sonner";

// Define response types for better type safety
type AIResponse = {
  message: string;
  timestamp: Date;
  error?: boolean;
  metadata?: Record<string, any>;
};

type ContextResponse = {
  success: boolean;
  error?: string;
};

/**
 * Initialize project context with improved error handling
 * @param projectId - The ID of the project
 * @returns True if the context was initialized successfully
 */
export async function initializeProjectContext(projectId: string): Promise<boolean> {
  if (!projectId) {
    console.error('Project ID is required');
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch('/api/ai/context/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initialize project context: ${response.status} ${errorText}`);
    }

    const data = await response.json() as ContextResponse;
    return data.success;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error initializing project context:', errorMessage);

    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Request timed out');
    }

    return false;
  }
}

/**
 * Send a message to the AI with improved error handling and performance
 * @param projectId - The ID of the project
 * @param message - The message to send
 * @param abortSignal - Optional AbortSignal for cancellation
 * @returns The AI's response
 */
export async function sendMessage(
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
    // Use the chat API endpoint
    const endpoint = '/api/ai/chat';

    // Create controller for timeout if no signal provided
    let controller: AbortController | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    if (!abortSignal) {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), 60000); // 60 second timeout
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
      const errorText = await response.text();
      throw new Error(`Failed to send message: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending message:', errorMessage);

    // Handle specific error types
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        message: 'The request took too long to process. Please try a shorter message or try again later.',
        timestamp: new Date(),
        error: true,
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
 * Perform an AI action with improved error handling
 * @param projectId - The ID of the project
 * @param action - The action to perform
 * @returns The result of the action
 */
export async function performAction(
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

    // Use the agent API endpoint
    const endpoint = '/api/ai/agent';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

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
      const errorText = await response.text();
      throw new Error(`Failed to perform action: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    toast.success('Action completed successfully!');

    return {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error performing action:', errorMessage);

    toast.error('Failed to perform action. Please try again.');

    // Handle specific error types
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        message: 'The action took too long to process. Please try a simpler action or try again later.',
        timestamp: new Date(),
        error: true,
      };
    }

    return {
      message: 'Sorry, I encountered an error while performing this action. Please try again.',
      timestamp: new Date(),
      error: true,
    };
  }
}
