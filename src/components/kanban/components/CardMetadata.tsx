/**
 * Card Metadata Component
 * Displays metadata information for a task card
 */

import { CheckSquare, MessageSquare, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechIcon } from "../utils/tech-icon-loader";
import { ChecklistStats } from "../utils/checklist-utils";

interface CardMetadataProps {
  techIcons: TechIcon[];
  checklistStats: ChecklistStats;
  commentsCount: number;
  attachmentsCount: number;
}

export default function CardMetadata({
  techIcons,
  checklistStats,
  commentsCount,
  attachmentsCount
}: CardMetadataProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
      {/* Tech Icons */}
      {techIcons.length > 0 && (
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-md">
          {techIcons.slice(0, 3).map((icon, index) => (
            <div
              key={`${icon.slug}-${index}`}
              className="h-4 w-4 flex-shrink-0"
              dangerouslySetInnerHTML={{ __html: icon.svg }}
              title={icon.title}
            />
          ))}
          {techIcons.length > 3 && (
            <span className="text-xs ml-1">+{techIcons.length - 3}</span>
          )}
        </div>
      )}

      {/* Checklist */}
      {checklistStats.hasChecklist && (
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-md">
          <CheckSquare className="h-4 w-4" />
          <span>{checklistStats.completed}/{checklistStats.total}</span>
        </div>
      )}

      {/* Comments */}
      {commentsCount > 0 && (
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-md">
          <MessageSquare className="h-4 w-4" />
          <span>{commentsCount}</span>
        </div>
      )}

      {/* Attachments */}
      {attachmentsCount > 0 && (
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-md">
          <Paperclip className="h-4 w-4" />
          <span>{attachmentsCount}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Checklist Progress Bar Component
 */
export function ChecklistProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className={cn(
          "h-2 rounded-full",
          progress === 100 ? "bg-green-500" : "bg-blue-500"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
