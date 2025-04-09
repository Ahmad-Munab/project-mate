/**
 * Action descriptions
 * Extracted from agent.ts to remove hardcoded elements
 */

import { ActionType } from "../action-detector";

/**
 * Get a human-readable description of an action
 * @param actionType The action type
 * @returns A human-readable description
 */
export function getActionDescription(actionType: ActionType): string {
  const descriptions: Record<ActionType, string> = {
    [ActionType.CREATE_TASK]: "create a new task",
    [ActionType.CREATE_COLUMN]: "create a new column",
    [ActionType.MOVE_TASK]: "move a task to a different column",
    [ActionType.UPDATE_TASK]: "update a task",
    [ActionType.DELETE_TASK]: "delete a task",
    [ActionType.DELETE_COLUMN]: "delete a column",
    [ActionType.SHOW_TASKS]: "show tasks",
    [ActionType.SHOW_COLUMNS]: "show columns",
    [ActionType.NONE]: "perform an action"
  };
  
  return descriptions[actionType] || "perform an action";
}
