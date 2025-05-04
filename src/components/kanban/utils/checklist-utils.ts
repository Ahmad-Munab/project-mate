/**
 * Checklist Utility Functions
 * Responsible for checklist-related calculations
 */

import { Task } from "../types";

export interface ChecklistStats {
  total: number;
  completed: number;
  hasChecklist: boolean;
  progress: number;
}

/**
 * Calculate checklist statistics for a task
 * @param task - The task containing checklist items
 * @returns Checklist statistics
 */
export function getChecklistStats(task: Task): ChecklistStats {
  const total = task.checklist?.length || 0;
  const completed = task.checklist?.filter(item => item.completed).length || 0;
  const hasChecklist = total > 0;
  const progress = hasChecklist ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    hasChecklist,
    progress
  };
}
