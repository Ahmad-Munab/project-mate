/**
 * AI Utilities
 * Common utility functions for AI operations
 */

import { toast } from "sonner";
import { AIMessage } from "@/store/aiStore";
import { Groq } from "groq-sdk";

/**
 * Initialize Groq client
 * @returns Groq client instance
 */
export function getGroqClient(): Groq {
  return new Groq({
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY!,
  });
}

/**
 * Handle API response with toast notifications
 * @param promise - Promise to handle
 * @param loadingMessage - Loading message to display
 * @param successMessage - Success message to display
 * @param errorMessage - Error message to display
 * @returns Result of the promise
 */
export async function handleApiWithToast<T>(
  promise: Promise<T>,
  loadingMessage: string,
  successMessage: string,
  errorMessage: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const toastId = toast.loading(loadingMessage);
  
  try {
    const result = await promise;
    toast.dismiss(toastId);
    toast.success(successMessage);
    return { success: true, data: result };
  } catch (error) {
    toast.dismiss(toastId);
    console.error(errorMessage, error);
    toast.error(errorMessage);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Format AI messages for display
 * @param messages - Array of AI messages
 * @returns Formatted messages
 */
export function formatAIMessages(messages: AIMessage[]): AIMessage[] {
  return messages.map(message => ({
    ...message,
    timestamp: new Date(message.timestamp),
    content: typeof message.content === 'string' 
      ? message.content 
      : JSON.stringify(message.content)
  }));
}

/**
 * Parse JSON from AI response
 * @param response - AI response string
 * @returns Parsed JSON object or null if parsing fails
 */
export function parseJsonFromAI<T>(response: string): T | null {
  try {
    // Try to parse direct JSON
    return JSON.parse(response) as T;
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\{\[][\s\S]*?[\}\]])\s*```/) || 
                      response.match(/([\{\[][\s\S]*?[\}\]])/);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]) as T;
      } catch (e2) {
        console.error("Failed to parse extracted JSON:", e2);
        return null;
      }
    }
    
    console.error("Failed to parse JSON from AI response:", e);
    return null;
  }
}

/**
 * Debounce function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
