/**
 * Priority Badge Component
 * Displays a priority level with appropriate styling
 */

import { cn } from "@/lib/utils";
import { PriorityInfo } from "../utils/priority-config";

interface PriorityBadgeProps {
  priorityInfo: PriorityInfo;
}

export default function PriorityBadge({ priorityInfo }: PriorityBadgeProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
      priorityInfo.color
    )}>
      {priorityInfo.icon}
      <span>{priorityInfo.label}</span>
    </div>
  );
}
