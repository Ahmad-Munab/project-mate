'use client';

import { useState } from "react";
import { tasks } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { Calendar, AlertCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskEditDialog from "./TaskEditDialog";

type Task = InferSelectModel<typeof tasks>;

const priorityColors = {
  LOW: "text-chart-2",
  MEDIUM: "text-chart-3",
  HIGH: "text-chart-4",
  URGENT: "text-destructive",
};

export default function TaskCard({ task, onTaskUpdate }: { 
  task: Task;
  onTaskUpdate?: (updatedTask: Task) => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
      <div className="bg-background rounded-lg p-3 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">{task.title}</h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {task.priority && (
            <div className="flex items-center gap-1">
              <AlertCircle
                className={`h-4 w-4 ${priorityColors[task.priority]}`}
              />
              <span>{task.priority}</span>
            </div>
          )}
        </div>
      </div>

      <TaskEditDialog
        task={task}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onTaskUpdate={(updatedTask) => {
          if (onTaskUpdate) {
            onTaskUpdate(updatedTask);
          }
        }}
      />
    </>
  );
}
