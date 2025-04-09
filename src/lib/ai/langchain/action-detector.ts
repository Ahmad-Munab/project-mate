/**
 * Integrated Action Detection System
 * This file implements an advanced, integrated action detection system using LangChain
 * that's part of a more comprehensive agent architecture
 */

import { ChatGroq } from "@langchain/groq";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnableBranch } from "@langchain/core/runnables";
import { z } from "zod";
import { getProjectTasks, getTaskStatuses, getProjectInfo } from "./tools";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Action types that the AI can detect and execute
export enum ActionType {
  CREATE_TASK = "CREATE_TASK",
  CREATE_COLUMN = "CREATE_COLUMN",
  MOVE_TASK = "MOVE_TASK",
  UPDATE_TASK = "UPDATE_TASK",
  DELETE_TASK = "DELETE_TASK",
  DELETE_COLUMN = "DELETE_COLUMN",
  SHOW_TASKS = "SHOW_TASKS",
  SHOW_COLUMNS = "SHOW_COLUMNS",
  ANALYZE_PROJECT = "ANALYZE_PROJECT",
  SUGGEST_IMPROVEMENTS = "SUGGEST_IMPROVEMENTS",
  GENERATE_ROADMAP = "GENERATE_ROADMAP",
  NONE = "NONE"
}

// Interface for detected actions with enhanced capabilities
export interface DetectedAction {
  type: ActionType;
  confidence: number; // 0-1 confidence score
  parameters: Record<string, any>; // Parameters for the action
  needsConfirmation: boolean; // Whether the action needs confirmation
  confirmationMessage?: string; // Message to show for confirmation
  reasoning?: string; // The reasoning behind the action detection
  alternativeActions?: Array<{ type: ActionType; confidence: number }>; // Alternative actions that could be taken
}

// Define the output schema for action detection with enhanced capabilities
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
    ActionType.ANALYZE_PROJECT,
    ActionType.SUGGEST_IMPROVEMENTS,
    ActionType.GENERATE_ROADMAP,
    ActionType.NONE
  ]).describe("The type of action to perform"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0-1) for the detected action"),
  parameters: z.record(z.any()).describe("Parameters for the action"),
  needsConfirmation: z.boolean().describe("Whether the action needs confirmation before execution"),
  confirmationMessage: z.string().optional().describe("Optional message to show for confirmation"),
  reasoning: z.string().optional().describe("The reasoning behind the action detection"),
  alternativeActions: z.array(
    z.object({
      type: z.enum([
        ActionType.CREATE_TASK,
        ActionType.CREATE_COLUMN,
        ActionType.MOVE_TASK,
        ActionType.UPDATE_TASK,
        ActionType.DELETE_TASK,
        ActionType.DELETE_COLUMN,
        ActionType.SHOW_TASKS,
        ActionType.SHOW_COLUMNS,
        ActionType.ANALYZE_PROJECT,
        ActionType.SUGGEST_IMPROVEMENTS,
        ActionType.GENERATE_ROADMAP,
        ActionType.NONE
      ]),
      confidence: z.number().min(0).max(1)
    })
  ).optional().describe("Alternative actions that could be taken")
});

/**
 * Create a model for the action detector
 * @param temperature - The temperature to use for the model
 * @returns A ChatGroq model
 */
function createModel(temperature: number = 0.2) {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "llama3-70b-8192",
    temperature,
  });
}

/**
 * Detect an action from a user message using an integrated LangChain approach
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @param context - Additional context for action detection
 * @returns The detected action or null if no action was detected
 */
export async function detectAction(
  projectId: string,
  userMessage: string,
  context: Record<string, any> = {}
): Promise<DetectedAction | null> {
  try {
    // Get comprehensive project context in a single operation
    const [tasks, columns, projectInfo] = await Promise.all([
      getProjectTasks(projectId),
      getTaskStatuses(projectId),
      getProjectInfo(projectId)
    ]);

    // Create the output parser
    const outputParser = StructuredOutputParser.fromZodSchema(actionSchema);

    // Create the prompt template with enhanced context and reasoning
    const promptTemplate = PromptTemplate.fromTemplate(`
You are an ADVANCED AI AGENT for a project management system. Your task is to analyze the user's message and determine what action they want to perform.

Project: ${projectInfo.project.name}
Description: ${projectInfo.project.description || "No description provided"}

Current project tasks:
${tasks.map(task => `- ${task.title} (ID: ${task.id}, Status: ${task.status}, Priority: ${task.priority})`).join('\n')}

Current columns (task statuses):
${columns.map(col => `- ${col.name} (Key: ${col.key})`).join('\n')}

User message: {userMessage}

First, think step by step about what the user is asking for. Consider multiple interpretations of the request.

Then determine the most likely action the user wants to perform. If the user is asking a question or making a statement that doesn't correspond to an action, return NONE as the action type.

Available actions:
- CREATE_TASK: Create a new task
- CREATE_COLUMN: Create a new column (task status)
- MOVE_TASK: Move a task to a different column
- UPDATE_TASK: Update an existing task
- DELETE_TASK: Delete a task
- DELETE_COLUMN: Delete a column
- SHOW_TASKS: Show tasks
- SHOW_COLUMNS: Show columns
- ANALYZE_PROJECT: Analyze the project's progress and status
- SUGGEST_IMPROVEMENTS: Suggest improvements to the project
- GENERATE_ROADMAP: Generate a roadmap for the project
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
- ANALYZE_PROJECT: aspects (e.g., "progress", "bottlenecks", "all")
- SUGGEST_IMPROVEMENTS: focus (e.g., "workflow", "organization", "all")
- GENERATE_ROADMAP: timeframe (e.g., "1 week", "1 month", "3 months")

Include your reasoning process and consider alternative interpretations of the user's request.

{format_instructions}
    `);

    // Create a more sophisticated chain with branching logic
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
      createModel(),
      outputParser,
    ]);

    // Run the chain
    const result = await chain.invoke({
      userMessage,
    });

    // Enhanced decision making about whether to return the action
    if (result.type === ActionType.NONE) {
      return null;
    }

    // For destructive actions, always require confirmation
    if (
      result.type === ActionType.DELETE_TASK ||
      result.type === ActionType.DELETE_COLUMN
    ) {
      result.needsConfirmation = true;
      if (!result.confirmationMessage) {
        result.confirmationMessage = `Are you sure you want to ${result.type === ActionType.DELETE_TASK ? 'delete this task' : 'delete this column'}?`;
      }
    }

    // If confidence is too low but not NONE, add reasoning and alternatives
    if (result.confidence < 0.6) {
      // If confidence is really low, return null
      if (result.confidence < 0.4) {
        return null;
      }

      // Otherwise, add a confirmation request
      result.needsConfirmation = true;
      if (!result.confirmationMessage) {
        result.confirmationMessage = `I'm not entirely sure, but I think you want to ${actionTypeToString(result.type)}. Is that correct?`;
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to detect action:", error);
    return null;
  }
}

/**
 * Convert an action type to a human-readable string
 * @param actionType - The action type to convert
 * @returns A human-readable string
 */
function actionTypeToString(actionType: ActionType): string {
  switch (actionType) {
    case ActionType.CREATE_TASK:
      return "create a new task";
    case ActionType.CREATE_COLUMN:
      return "create a new column";
    case ActionType.MOVE_TASK:
      return "move a task to a different column";
    case ActionType.UPDATE_TASK:
      return "update a task";
    case ActionType.DELETE_TASK:
      return "delete a task";
    case ActionType.DELETE_COLUMN:
      return "delete a column";
    case ActionType.SHOW_TASKS:
      return "show tasks";
    case ActionType.SHOW_COLUMNS:
      return "show columns";
    case ActionType.ANALYZE_PROJECT:
      return "analyze the project";
    case ActionType.SUGGEST_IMPROVEMENTS:
      return "suggest improvements";
    case ActionType.GENERATE_ROADMAP:
      return "generate a roadmap";
    default:
      return "perform an action";
  }
}

/**
 * Integrated action detection and execution system
 * This combines detection and execution in a single call to reduce API usage
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns The result of the action execution
 */
export async function detectAndExecuteAction(projectId: string, userMessage: string) {
  try {
    // Get comprehensive project context
    const projectInfo = await getProjectInfo(projectId);

    // Create a model
    const model = createModel(0.7); // Higher temperature for more creative responses

    // Create a prompt template for the integrated system
    const promptTemplate = PromptTemplate.fromTemplate(`
You are Mate, an ADVANCED AI AGENT for the project "${projectInfo.project.name}".

Project description: ${projectInfo.project.description || "No description provided"}

User message: {userMessage}

First, determine if the user is asking you to perform a specific action on the project management system, or if they're asking a general question or having a conversation.

If they're asking for a specific action, identify what action they want (create task, update task, create column, etc.) and what parameters are needed.

If they're asking a general question or having a conversation, provide a helpful response based on the project context.

Think step by step and be thorough in your analysis. Consider multiple interpretations of the user's request.

Your response should be helpful, informative, and directly address the user's request.
    `);

    // Create a chain for the integrated system
    const chain = RunnableSequence.from([
      promptTemplate,
      model,
      new StringOutputParser(),
    ]);

    // Run the chain
    const result = await chain.invoke({
      userMessage,
    });

    return result;
  } catch (error) {
    console.error("Failed to detect and execute action:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
}
