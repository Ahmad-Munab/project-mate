/**
 * Date Utility Functions
 * Responsible for date-related calculations and formatting
 */

/**
 * Check if a due date is overdue
 * @param dueDate - The due date to check
 * @param status - The current task status
 * @returns True if the due date is overdue
 */
export function isDueDateOverdue(dueDate: string | Date | null | undefined, status: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && status !== "DONE";
}

/**
 * Check if a due date is coming soon (within 2 days)
 * @param dueDate - The due date to check
 * @param status - The current task status
 * @returns True if the due date is coming soon
 */
export function isDueDateSoon(dueDate: string | Date | null | undefined, status: string): boolean {
  if (!dueDate) return false;
  const dueDateObj = new Date(dueDate);
  const now = new Date();
  const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
  
  return dueDateObj > now && 
         dueDateObj.getTime() - now.getTime() < twoDaysInMs && 
         status !== "DONE";
}

/**
 * Format a due date to a human-readable string
 * @param dueDate - The due date to format
 * @returns Formatted date string or null if no date provided
 */
export function formatDueDate(dueDate: string | Date | null | undefined): string | null {
  if (!dueDate) return null;
  
  return new Date(dueDate).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric' 
  });
}
