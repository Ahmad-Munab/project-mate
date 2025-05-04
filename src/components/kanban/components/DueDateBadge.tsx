/**
 * Due Date Badge Component
 * Displays a formatted due date with appropriate styling
 */

import { Calendar, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DueDateBadgeProps {
  dueDate: string | null;
  isOverdue: boolean;
  isSoon: boolean;
  isCompleted: boolean;
}

export default function DueDateBadge({
  dueDate,
  isOverdue,
  isSoon,
  isCompleted
}: DueDateBadgeProps) {
  if (!dueDate) return null;

  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
      isOverdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
      isSoon ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
      isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
      "bg-gray-100 dark:bg-gray-700"
    )}>
      {isOverdue ? (
        <AlertCircle className="h-4 w-4" />
      ) : isSoon ? (
        <Clock className="h-4 w-4" />
      ) : (
        <Calendar className="h-4 w-4" />
      )}
      <span>{dueDate}</span>
    </div>
  );
}
