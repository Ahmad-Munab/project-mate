/**
 * Response templates
 * Extracted from agent.ts to remove hardcoded elements
 */

import { ActionType } from "../action-detector";

/**
 * Get a response template for an action
 * @param actionType The action type
 * @param parameters Parameters for the template
 * @returns A response template
 */
export function getActionResponseTemplate(
  actionType: ActionType, 
  parameters: Record<string, any> = {}
): string {
  const templates: Record<ActionType, string> = {
    [ActionType.CREATE_TASK]: "I'll create that task for you right away.",
    [ActionType.CREATE_COLUMN]: `I'll add a new ${parameters.name || 'column'} to your board.`,
    [ActionType.MOVE_TASK]: `I'll move that task to the ${parameters.targetColumnName || 'specified column'} column.`,
    [ActionType.UPDATE_TASK]: "I'll update that task for you.",
    [ActionType.DELETE_TASK]: "Are you sure you want to delete the task? This action cannot be undone.",
    [ActionType.DELETE_COLUMN]: "Are you sure you want to delete the column? This will also delete all tasks in this column and cannot be undone.",
    [ActionType.SHOW_TASKS]: "",
    [ActionType.SHOW_COLUMNS]: "",
    [ActionType.NONE]: ""
  };
  
  return templates[actionType] || "";
}

/**
 * Get the contextual instruction template
 * @param conversationSummary Summary of the recent conversation
 * @param userMessage The current user message
 * @returns The contextual instruction
 */
export function getContextualInstructionTemplate(
  conversationSummary: string,
  userMessage: string
): string {
  return `
CRITICAL CONVERSATION CONTEXT:

Recent conversation history:
${conversationSummary}

INTELLIGENT RESPONSE GUIDELINES:
1. Analyze the conversation flow and user's intent deeply
2. Respond directly to the user's current message: "${userMessage}"
3. Maintain perfect context awareness from the conversation history
4. Be exceptionally smart, natural, and helpful in your response
5. Show your superior intelligence through insightful, relevant responses
6. Be concise but thorough - address exactly what the user is asking
7. If the user seems frustrated, be extra helpful and precise
8. If appropriate, take immediate action rather than just responding
9. Use natural, conversational language as a brilliant colleague would
10. Demonstrate your understanding of the project context in your response
  `.trim();
}
