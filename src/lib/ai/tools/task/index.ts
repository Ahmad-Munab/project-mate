/**
 * Task Tools Index
 * This file exports all task-related tools
 */

export { createTaskTool } from './create-task';
export { updateTaskTool } from './update-task';
export { deleteTaskTool } from './delete-task';
export { moveTaskTool } from './move-task';
export { suggestTechIconsTool, applyTechIconsTool } from './suggest-tech-icons';

// New advanced task tools
export { batchCreateTasksTool } from './batch-create-tasks';
export { batchUpdateTasksTool } from './batch-update-tasks';
export { assignTaskTool } from './assign-task';
export { unassignTaskTool } from './unassign-task';
export { getTaskAssigneesTool } from './get-task-assignees';
export { setTaskDueDateTool } from './set-task-due-date';
export { searchTasksTool } from './search-tasks';
export { bulkMoveTasksTool } from './bulk-move-tasks';
export { suggestTaskPrioritiesTool } from './suggest-priorities';
