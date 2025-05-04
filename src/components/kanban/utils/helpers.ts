import { Task, TaskStatus } from "../types";
import {
  getDefaultTaskStatuses as getDynamicTaskStatuses,
  priorityConfig
} from "@/config/dynamic-defaults";

/**
 * Get minimal default task statuses as a fallback when API calls fail
 * @param projectId Project ID
 * @returns Array of default task statuses
 */
export const getDefaultTaskStatuses = (projectId: string): TaskStatus[] => {
  // Use the dynamic configuration system
  return getDynamicTaskStatuses(projectId);
};

/**
 * Sort tasks based on the specified criteria
 * @param tasks Tasks to sort
 * @param sortBy Sort criteria
 * @param sortDirection Sort direction
 * @returns Sorted tasks
 */
export const sortTasks = (
  tasks: Task[],
  sortBy: string,
  sortDirection: "asc" | "desc"
): Task[] => {
  console.log("sortTasks called with:", { sortBy, sortDirection, taskCount: tasks.length });

  // Create a new array to avoid modifying the original
  const tasksCopy = [...tasks];

  // Sort the copy
  const sortedTasks = tasksCopy.sort((a, b) => {
    switch (sortBy) {
      case "title":
        return sortDirection === "asc"
          ? (a.title || "").localeCompare(b.title || "")
          : (b.title || "").localeCompare(a.title || "");

      case "priority":
        // Get priority order from configuration
        const priorityOrder = priorityConfig.order;

        // Get priority values, defaulting to lowest priority if not found
        const aValue = priorityOrder[a.priority as keyof typeof priorityOrder] ??
                      Object.keys(priorityOrder).length; // Default to lowest priority
        const bValue = priorityOrder[b.priority as keyof typeof priorityOrder] ??
                      Object.keys(priorityOrder).length;

        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;

      case "dueDate":
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return sortDirection === "asc" ? 1 : -1;
        if (!b.due_date) return sortDirection === "asc" ? -1 : 1;
        const aDate = new Date(a.due_date).getTime();
        const bDate = new Date(b.due_date).getTime();
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;

      default: // createdAt
        const aTime = new Date(a.created_at || Date.now()).getTime();
        const bTime = new Date(b.created_at || Date.now()).getTime();
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    }
  });

  console.log("Sorting complete. First few tasks:", sortedTasks.slice(0, 3));

  return sortedTasks;
};
