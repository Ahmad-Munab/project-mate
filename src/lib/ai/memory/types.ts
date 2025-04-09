/**
 * Types for AI memory system
 */

// Type for AI message
export type AIMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
};

// Format messages for AI model
export function formatMessagesForAI(messages: AIMessage[]) {
  return messages.map(message => ({
    role: message.role,
    content: message.content
  }));
}
