"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Task } from "../types";

interface DeleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onTaskDelete: (taskId: string) => void;
}

export default function DeleteTaskDialog({
  open,
  onOpenChange,
  task,
  onTaskDelete,
}: DeleteTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/tasks/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId: task.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      onTaskDelete(task.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="dark:border-gray-700">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-3">
            <div className="bg-muted/50 p-3 rounded-md border border-muted mb-4">
              <p className="font-medium text-sm">{task.title}</p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
            <p>Are you sure you want to delete this task? This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Deleting...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Trash2 className="h-4 w-4" />
                Delete Task
              </span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
