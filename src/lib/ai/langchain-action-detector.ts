/**
 * LangChain Action Detector
 * This file implements a proper LangChain-based action detector
 */

import { ChatGroq } from "@langchain/groq";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
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

// Define the output schema for action detection
const actionSchema = z.object({
  type: z.enum([
    ActionType.CREATE_TASK,
    ActionType.CREATE_COLUMN,
    ActionType.MOVE_TASK,
    ActionType.UPDATE_TASK,
    ActionType.DELETE_TASK,
    ActionType.DELETE_COLUMN,
    ActionType.SHOW_TASKS,
    ActionType.SHOW_COLUMNS,
    ActionType.NONE
  ]).describe("The type of action to perform"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0-1) for the detected action"),
  parameters: z.record(z.any()).describe("Parameters for the action"),
  needsConfirmation: z.boolean().describe("Whether the action needs confirmation before execution"),
  confirmationMessage: z.string().optional().describe("Optional message to show for confirmation"),
});

/**
 * Detect an action from a user message using LangChain
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The detected action or null if no action was detected
 */
export async function detectAction(projectId: string, userMessage: string): Promise<DetectedAction | null> {
  try {
    // Get project context
    const tasks = await getProjectTasks(projectId);
    const columns = await getTaskStatuses(projectId);
    
    // Create the model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama3-70b-8192",
      temperature: 0.2, // Lower temperature for more deterministic results
    });
    
    // Create the output parser
    const outputParser = StructuredOutputParser.fromZodSchema(actionSchema);
    
    // Create the prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a SUPERINTELLIGENT action detector for a project management system. Your task is to analyze the user's message and determine what action they want to perform.

Current project tasks:
${tasks.map(task => `- ${task.title} (ID: ${task.id}, Status: ${task.status})`).join('\n')}

Current columns (task statuses):
${columns.map(col => `- ${col.name} (Key: ${col.key})`).join('\n')}

User message: {userMessage}

Determine the most likely action the user wants to perform. If the user is asking a question or making a statement that doesn't correspond to an action, return NONE as the action type.

Available actions:
- CREATE_TASK: Create a new task
- CREATE_COLUMN: Create a new column (task status)
- MOVE_TASK: Move a task to a different column
- UPDATE_TASK: Update an existing task
- DELETE_TASK: Delete a task
- DELETE_COLUMN: Delete a column
- SHOW_TASKS: Show tasks
- SHOW_COLUMNS: Show columns
- NONE: No action detected

For each action, extract relevant parameters:
- CREATE_TASK: title, description, status, priority
- CREATE_COLUMN: name, color
- MOVE_TASK: taskId or taskTitle, targetStatus
- UPDATE_TASK: taskId or taskTitle, updates (title, description, status, priority)
- DELETE_TASK: taskId or taskTitle
- DELETE_COLUMN: columnId or columnName, moveTasksTo
- SHOW_TASKS: filter (status, priority)
- SHOW_COLUMNS: none

{format_instructions}
    `);
    
    // Create the chain
    const chain = RunnableSequence.from([
      {
        promptInput: async (input: { userMessage: string }) => {
          return {
            userMessage: input.userMessage,
            format_instructions: outputParser.getFormatInstructions(),
          };
        },
      },
      {
        prompt: promptTemplate,
        promptInput: (formattedInput) => formattedInput,
      },
      model,
      outputParser,
    ]);
    
    // Run the chain
    const result = await chain.invoke({
      userMessage,
    });
    
    // If the action is NONE or confidence is too low, return null
    if (result.type === ActionType.NONE || result.confidence < 0.4) {
      return null;
    }
    
    return result;
  } catch (error) {
    console.error("Failed to detect action:", error);
    return null;
  }
}
