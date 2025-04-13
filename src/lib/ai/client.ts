/**
 * Client-side AI functions
 * This file contains functions for interacting with the AI system from the client side
 */

/**
 * Initialize project context
 * @param projectId - The ID of the project
 * @returns True if the context was initialized successfully
 */
export async function initializeProjectContext(projectId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/ai/context/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize project context: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error initializing project context:', error);
    return false;
  }
}

/**
 * Send a message to the AI
 * @param projectId - The ID of the project
 * @param message - The message to send
 * @param options - Options for the AI
 * @returns The AI's response
 */
export async function sendMessage(
  projectId: string,
  message: string,
  options: {
    conversational?: boolean;
    detectOnly?: boolean;
    integrated?: boolean;
    useAgent?: boolean;
  } = {}
) {
  try {
    // Use the agent API if specified
    const endpoint = options.useAgent ? '/api/ai/agent' : '/api/ai/chat';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        message,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      message: 'Sorry, I encountered an error while processing your message. Please try again.',
      timestamp: new Date(),
      error: true,
    };
  }
}
