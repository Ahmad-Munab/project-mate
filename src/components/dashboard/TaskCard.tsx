"use client";

import { useState } from "react";
import { Calendar, Pencil, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TaskEditDialog from "./TaskEditDialog";
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
import { Task } from "./ProjectBoard";

interface TaskCardProps {
  task: Task;
  onTaskUpdate: (updatedTask: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

const priorityConfig = {
  LOW: {
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    label: "Low",
  },
  MEDIUM: {
    color: "text-chart-3",
    bg: "bg-chart-3/10",
    label: "Medium",
  },
  HIGH: {
    color: "text-chart-4",
    bg: "bg-chart-4/10",
    label: "High",
  },
  URGENT: {
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Urgent",
  },
};

export default function TaskCard({
  task,
  onTaskUpdate,
  onTaskDelete,
}: TaskCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const priorityStyle = priorityConfig[task.priority];

  const handleDelete = async () => {
    try {
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

      onTaskDelete?.(task.id);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  return (
    <>
      <div className="bg-card rounded-lg shadow-sm border hover:border-ring/20 transition-colors">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1">
              <h4 className="font-medium line-clamp-2">{task.title}</h4>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 -mt-1"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 -mt-1 text-destructive hover:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`${priorityStyle.bg} ${priorityStyle.color}`}
              >
                {priorityStyle.label}
              </Badge>
              {task.due_date && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* {task.assignee && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.avatar} />
                <AvatarFallback>
                  {task.assignee.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )} */}
          </div>
        </div>

        <div className="px-4 py-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span>Drag to reorder</span>
        </div>
      </div>

      <TaskEditDialog
        task={task}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onTaskUpdate={onTaskUpdate}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{task.title}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive  hover:bg-red-800"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
