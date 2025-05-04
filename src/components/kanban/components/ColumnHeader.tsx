/**
 * Column Header Component
 * Responsible for displaying and editing column headers
 */

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { TaskStatus } from "../types";

interface ColumnHeaderProps {
  status: TaskStatus;
  taskCount: number;
  canEditColumns: boolean;
  onColumnUpdate: (columnId: string, name: string) => Promise<void>;
  onColumnDelete: (columnId: string) => Promise<void>;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}

export default function ColumnHeader({
  status,
  taskCount,
  canEditColumns,
  onColumnUpdate,
  onColumnDelete,
  dragHandleProps,
}: ColumnHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(status.name);
  const columnTitleInputRef = useRef<HTMLInputElement>(null);

  // Handle column title update
  const handleColumnTitleUpdate = async () => {
    if (!columnTitle.trim() || columnTitle === status.name) {
      setColumnTitle(status.name);
      setIsEditingTitle(false);
      return;
    }

    try {
      await onColumnUpdate(status.id, columnTitle);
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Error updating column:", error);
      toast.error("Failed to update column");
      setColumnTitle(status.name);
      setIsEditingTitle(false);
    }
  };

  // Focus input when editing title
  useEffect(() => {
    if (isEditingTitle && columnTitleInputRef.current) {
      columnTitleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  return (
    <div className="px-2 py-2 flex items-center justify-between">
      {isEditingTitle ? (
        <div className="flex items-center gap-1 flex-1">
          <Input
            ref={columnTitleInputRef}
            value={columnTitle}
            onChange={(e) => setColumnTitle(e.target.value)}
            className="h-7 text-sm font-medium"
            onBlur={handleColumnTitleUpdate}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleColumnTitleUpdate();
              } else if (e.key === "Escape") {
                setColumnTitle(status.name);
                setIsEditingTitle(false);
              }
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1">
          {/* Drag Handle for Column (hidden for BACKLOG or default columns) */}
          {status.key === "BACKLOG" || status.is_default ? (
            <div className="w-4"></div> // Empty spacer for alignment
          ) : (
            <div {...dragHandleProps} className="cursor-grab">
              <GripVertical className="h-4 w-4 text-gray-300" />
            </div>
          )}

          <div
            className="px-2 py-1 text-sm font-medium cursor-pointer rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex-1"
            onClick={() => canEditColumns && setIsEditingTitle(true)}
          >
            <div className="flex items-center justify-between">
              <span>{status.name}</span>
              <span className="text-xs text-gray-300 dark:text-gray-200">
                {taskCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {canEditColumns && !isEditingTitle && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-300"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (status.is_default) {
                  return;
                }
                onColumnDelete(status.id);
              }}
              disabled={status.is_default}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
