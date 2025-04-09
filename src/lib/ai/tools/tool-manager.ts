/**
 * Tool manager for the AI assistant
 * This file contains functions to manage and execute AI tools
 * Following the single responsibility principle, each function handles a specific tool-related task
 */

import { createTask, updateTask, deleteTask, getProjectTasks } from './task-tools';
import { createTaskStatus, updateTaskStatus, deleteTaskStatus, getTaskStatuses, moveTask } from './column-tools';
import { ActionType } from '../action-detector';

/**
 * Execute a tool based on the detected action
 * @param projectId Project ID
 * @param action The detected action
 * @returns The result of the tool execution
 */
export async function executeToolAction(
  projectId: string,
  action: { type: ActionType; parameters: any; confidence: number }
): Promise<string> {
  try {
    switch (action.type) {
      case ActionType.CREATE_TASK:
        const newTask = await createTask(
          projectId,
          action.parameters.title,
          action.parameters.description || '',
          action.parameters.status || 'BACKLOG',
          action.parameters.priority || 'MEDIUM'
        );
        return `Created task "${newTask.title}" in ${newTask.status}.`;

      case ActionType.UPDATE_TASK:
        const updatedTask = await updateTask(
          action.parameters.taskId,
          action.parameters.updates
        );
        return `Updated task "${updatedTask.title}".`;

      case ActionType.MOVE_TASK:
        const movedTask = await moveTask(
          action.parameters.taskId,
          action.parameters.targetStatus,
          projectId
        );
        return `Moved task "${movedTask.title}" to ${movedTask.status}.`;

      case ActionType.DELETE_TASK:
        await deleteTask(action.parameters.taskId);
        return `Deleted the task.`;

      case ActionType.CREATE_COLUMN:
        const newColumn = await createTaskStatus(
          projectId,
          action.parameters.name,
          action.parameters.color || 'gray'
        );
        return `Created column "${newColumn.name}".`;

      case ActionType.DELETE_COLUMN:
        await deleteTaskStatus(
          action.parameters.columnId,
          projectId,
          action.parameters.moveTasksTo
        );
        return `Deleted the column.`;

      default:
        return '';
    }
  } catch (error) {
    console.error(`Error executing tool action ${action.type}:`, error);
    throw error;
  }
}

/**
 * Get information about tasks in a specific status
 * @param projectId Project ID
 * @param status Status to filter by
 * @returns Formatted string with task information
 */
export async function getTasksByStatusInfo(
  projectId: string,
  status: string
): Promise<string> {
  const allTasks = await getProjectTasks(projectId);
  const tasks = allTasks.filter(task => 
    task.status === status || task.status_key === status
  );
  
  if (tasks.length === 0) {
    return `There are no tasks in ${status}.`;
  }
  
  return `Tasks in ${status}:\n\n${tasks.map(task => {
    const desc = task.description || '';
    return `- **${task.title}** (Priority: ${task.priority})\n  ${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}`;
  }).join('\n\n')}`;
}

/**
 * Get information about all columns in a project
 * @param projectId Project ID
 * @returns Formatted string with column information
 */
export async function getColumnsInfo(projectId: string): Promise<string> {
  const columns = await getTaskStatuses(projectId);
  
  if (columns.length === 0) {
    return `This project doesn't have any columns yet.`;
  }
  
  return `Columns in this project:\n\n${columns.map(column => 
    `- **${column.name}** (${column.key})`
  ).join('\n')}`;
}
