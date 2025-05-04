"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskStatus } from "./types";
import TrelloCardModal from "./dialogs/TrelloCardModal";

// Import extracted utilities and components
import { processTechIcons, TechIcon } from "./utils/tech-icon-loader";
import { isDueDateOverdue, isDueDateSoon, formatDueDate } from "./utils/date-utils";
import { getPriorityInfo } from "./utils/priority-config";
import { getChecklistStats } from "./utils/checklist-utils";
import CardLabels from "./components/CardLabels";
import CardMetadata, { ChecklistProgressBar } from "./components/CardMetadata";
import CardMembers from "./components/CardMembers";
import DueDateBadge from "./components/DueDateBadge";
import PriorityBadge from "./components/PriorityBadge";

interface TrelloCardProps {
  task: Task;
  onTaskUpdate: (updatedTask: Task) => void;
  onTaskDelete: (taskId: string) => void;
  taskStatuses: TaskStatus[];
  isDragPreview?: boolean;
}

export default function TrelloCard({
  task,
  onTaskUpdate,
  onTaskDelete,
  taskStatuses,
  isDragPreview = false,
}: TrelloCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [techIcons, setTechIcons] = useState<TechIcon[]>([]);

  // Load tech icons if available
  useEffect(() => {
    setTechIcons(processTechIcons(task.tech_icons, task.tech_icon));
  }, [task.tech_icon, task.tech_icons]);

  // Get due date information
  const isOverdue = isDueDateOverdue(task.due_date, task.status || "");
  const isSoon = isDueDateSoon(task.due_date, task.status || "");
  const formattedDueDate = formatDueDate(task.due_date);

  // Get checklist information
  const checklistStats = getChecklistStats(task);

  // Count comments and attachments
  const commentsCount = task.comments?.length || 0;
  const attachmentsCount = task.attachments?.length || 0;

  // Get priority information
  const priority = task.priority || "MEDIUM";
  const priorityInfo = getPriorityInfo(priority);

  return (
    <>
      <div
        className={cn(
          "group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden task-card",
          isDragPreview ? "is-dragging" : "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transform hover:-translate-y-1"
        )}
      >
        {/* Top colored bar based on priority */}
        <div className={cn("h-1 w-full", priorityInfo.barColor)} />

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <CardLabels labels={task.labels} />
        )}

        <div className="p-4" onClick={() => !isDragPreview && setIsModalOpen(true)}>
          {/* Title with Edit/Delete buttons that appear on hover */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-medium text-base text-gray-900 dark:text-gray-100">{task.title}</h3>
            {!isDragPreview && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                  aria-label="Edit task"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this task?")) {
                      onTaskDelete(task.id);
                    }
                  }}
                  aria-label="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Description (truncated) */}
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Priority Badge and Due Date */}
          <div className="flex items-center justify-between mb-4">
            <PriorityBadge priorityInfo={priorityInfo} />

            {formattedDueDate && (
              <DueDateBadge
                dueDate={formattedDueDate}
                isOverdue={isOverdue}
                isSoon={isSoon}
                isCompleted={task.status === "DONE"}
              />
            )}
          </div>

          {/* Metadata Row */}
          <div className="flex items-center justify-between">
            <CardMetadata
              techIcons={techIcons}
              checklistStats={checklistStats}
              commentsCount={commentsCount}
              attachmentsCount={attachmentsCount}
            />

            {/* Members */}
            {task.members && task.members.length > 0 && (
              <CardMembers members={task.members} />
            )}
          </div>
        </div>

        {/* Checklist Progress Bar (if has checklist) */}
        {checklistStats.hasChecklist && (
          <div className="px-4 pb-4">
            <ChecklistProgressBar progress={checklistStats.progress} />
          </div>
        )}
      </div>

      {/* Card Modal */}
      <TrelloCardModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        task={task}
        onTaskUpdate={onTaskUpdate}
        onTaskDelete={onTaskDelete}
        taskStatuses={taskStatuses}
      />
    </>
  );
}
