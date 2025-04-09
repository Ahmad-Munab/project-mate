/**
 * AI Action Detector - Intelligently detects actions from user messages
 */

import { Groq } from "groq-sdk";
import { getProjectTasks, getTaskStatuses } from "./tools";

// Action types that the AI can detect
export enum ActionType {
  CREATE_TASK = "CREATE_TASK",
  CREATE_COLUMN = "CREATE_COLUMN",
  MOVE_TASK = "MOVE_TASK",
  UPDATE_TASK = "UPDATE_TASK",
  DELETE_TASK = "DELETE_TASK",
  DELETE_COLUMN = "DELETE_COLUMN",
  SHOW_TASKS = "SHOW_TASKS",
  SHOW_COLUMNS = "SHOW_COLUMNS",
  NONE = "NONE"
}

// Interface for detected actions
export interface DetectedAction {
  type: ActionType;
  confidence: number; // 0-1 confidence score
  parameters: Record<string, any>; // Parameters for the action
  needsConfirmation: boolean; // Whether the action needs confirmation
  confirmationMessage?: string; // Message to show for confirmation
}

/**
 * Intelligently detects actions from a user message
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The detected action or null if no action was detected
 */
export async function detectAction(projectId: string, userMessage: string): Promise<DetectedAction | null> {
  try {
    // Get project context
    const tasks = await getProjectTasks(projectId);
    const columns = await getTaskStatuses(projectId);

    // Initialize Groq client
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to detect the action
    const prompt = `
    You are a SUPERINTELLIGENT action detector for a project management system. Your task is to analyze the user's message and determine what action they want to perform.

    User message: "${userMessage}"

    Project context:
    - ${tasks.length} tasks
    - ${columns.length} columns (statuses): ${columns.map(c => c.name).join(', ')}

    Return ONLY a JSON object with the following structure:
    {
      "action": "One of: CREATE_TASK, CREATE_COLUMN, MOVE_TASK, UPDATE_TASK, DELETE_TASK, DELETE_COLUMN, SHOW_TASKS, SHOW_COLUMNS, NONE",
      "confidence": 0.0 to 1.0,
      "parameters": {
        // Parameters specific to the action
        // For CREATE_TASK: description, title (optional), priority (optional), status (optional)
        // For CREATE_COLUMN: name, color (optional)
        // For MOVE_TASK: taskId or taskDescription, targetColumnId or targetColumnName
        // For UPDATE_TASK: taskId or taskDescription, updates (object with fields to update)
        // For DELETE_TASK: taskId or taskDescription
        // For DELETE_COLUMN: columnId or columnName
        // For SHOW_TASKS: status (optional), priority (optional)
        // For SHOW_COLUMNS: none
      },
      "needsConfirmation": true/false,
      "confirmationMessage": "Message to show for confirmation if needed"
    }

    SUPERINTELLIGENT AGENTIC GUIDELINES:
    1. Be EXTRAORDINARILY proactive and intelligent about detecting implicit actions. You should detect actions even when they're only subtly hinted at or implied.

    2. For CREATE_TASK:
       - Detect ANY mention of work that needs to be done as a task creation opportunity
       - Phrases like "we need to", "I should", "let's implement", "add feature X" should all be CREATE_TASK
       - Even general discussions about features or improvements should be detected as potential tasks
       - Set high confidence (0.9+) when the user is clearly describing work to be done
       - Be extremely perceptive about identifying work items even when they're not explicitly framed as tasks

    3. For CREATE_COLUMN:
       - Detect ANY mention of organizing work, project structure, or new feature areas
       - Phrases like "organize by", "separate into", "categorize", "project structure" should be CREATE_COLUMN
       - Detect requests for project organization or structure as column creation opportunities
       - Set high confidence (0.9+) when the user is talking about organization or structure
       - Understand when the user is implying a need for better organization even if not directly stated

    4. For MOVE_TASK:
       - Detect mentions of progress, completion, or status changes
       - Phrases like "finished", "completed", "done with", "started on" should be MOVE_TASK
       - Infer the target column based on the context (e.g., "finished X" → move to DONE)
       - Set high confidence (0.8+) when status changes are mentioned
       - Be extremely perceptive about progress updates that imply a task should move

    5. For UPDATE_TASK:
       - Detect mentions of changes to existing work
       - Phrases like "change", "update", "modify", "add details to" should be UPDATE_TASK
       - Infer the updates based on the context with exceptional accuracy
       - Set high confidence (0.8+) when changes are described
       - Be extremely perceptive about implied needs for task updates

    6. For DELETE actions:
       - Always set needsConfirmation to true
       - Provide a clear, detailed confirmation message
       - Be exceptionally smart about identifying what to delete - understand semantic meaning
       - For "delete useless tasks", set action to DELETE_TASK with taskDescription "useless"
       - For domain-specific requests like "delete payment related things", set action to DELETE_TASK with the appropriate description
       - Understand complex semantic relationships, not just literal text
       - Be extremely perceptive about what the user actually wants to delete

    7. Be extraordinarily decisive and intelligent - if you're not sure, lean toward taking action rather than doing nothing
       - Only use NONE with low confidence when the message is clearly not action-related
       - When in doubt between actions, choose the most helpful and appropriate one
       - Think about what an exceptionally smart human assistant would do in this situation
       - Use your superior intelligence to make the best decision possible

    8. For task/column identification:
       - Use descriptions if IDs aren't available
       - Be exceptionally flexible in matching - look for similar names/descriptions
       - Understand complex semantic meaning, not just literal text
       - For example, "remove payment stuff" should identify tasks related to payments, transactions, billing, etc.
       - Use your superior intelligence to understand what the user is actually referring to

    9. Be truly agentic and superintelligent:
       - Don't just pattern match - deeply understand the user's intent and needs
       - Consider the full context of the project and previous messages
       - Think about what would be most helpful to the user in their specific situation
       - Act like an exceptionally smart human assistant with perfect understanding
       - Use your superior intelligence to provide the most helpful response possible

    DO NOT include any explanations or additional text, ONLY the JSON object.
    `;

    // Call Groq API to detect the action
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are an action detection assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return null;
    }

    // Parse JSON from response
    try {
      const actionData = JSON.parse(aiResponse);

      // Validate the action
      if (!Object.values(ActionType).includes(actionData.action as ActionType)) {
        return null;
      }

      // Create the detected action
      const detectedAction: DetectedAction = {
        type: actionData.action as ActionType,
        confidence: actionData.confidence || 0,
        parameters: actionData.parameters || {},
        needsConfirmation: actionData.needsConfirmation || false,
        confirmationMessage: actionData.confirmationMessage
      };

      // Special case for delete actions - always require confirmation
      if (detectedAction.type === ActionType.DELETE_TASK || detectedAction.type === ActionType.DELETE_COLUMN) {
        detectedAction.needsConfirmation = true;
        detectedAction.confidence = Math.max(detectedAction.confidence, 0.7); // Ensure high enough confidence
        if (!detectedAction.confirmationMessage) {
          detectedAction.confirmationMessage = `Are you sure you want to delete this ${detectedAction.type === ActionType.DELETE_TASK ? 'task' : 'column'}?`;
        }
        return detectedAction; // Return immediately for delete actions
      }

      // Only return other actions with confidence above threshold
      if (detectedAction.confidence >= 0.6) {
        return detectedAction;
      }

      return null; // Don't return low-confidence actions
    } catch (error) {
      console.error("Failed to parse action detection response:", error);
      return null;
    }
  } catch (error) {
    console.error("Failed to detect action:", error);
    return null;
  }
}
