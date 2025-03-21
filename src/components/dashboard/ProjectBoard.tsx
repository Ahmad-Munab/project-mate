'use client';

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TaskCard from "./TaskCard";
import { tasks } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Task = InferSelectModel<typeof tasks>;

const columnColors = {
  BACKLOG: "bg-gray-50 dark:bg-gray-900",
  TODO: "bg-neutral-50 dark:bg-neutral-900",
  IN_PROGRESS: "bg-blue-50 dark:bg-blue-900/20",
  DONE: "bg-green-50 dark:bg-green-900/20",
};

const columnHeaders = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

async function updateTaskStatus(taskId: string, newStatus: string) {
  try {
    const response = await fetch('/api/tasks/update', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        status: newStatus,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update task status');
    }
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

async function fetchProjectTasks(projectId: string) {
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export default function ProjectBoard({
  projectId,
  initialTasks,
}: {
  projectId?: string;
  initialTasks: Task[];
}) {
  const [projectTasks, setProjectTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      fetchProjectTasks(projectId)
        .then(tasks => setProjectTasks(tasks))
        .finally(() => setIsLoading(false));
    }
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a project to view tasks</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const columns = Object.keys(columnHeaders) as Array<keyof typeof columnHeaders>;

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    const newStatus = destination.droppableId;
    const taskId = draggableId;

    try {
      // Optimistically update the UI
      setProjectTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus as Task['status'] }
            : task
        )
      );

      // Make the API call to persist the change
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      // Revert the UI if the API call fails
      console.error('Failed to update task status:', error);
      setProjectTasks(initialTasks);
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setProjectTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold">Project Board</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your project tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Sort by Priority</DropdownMenuItem>
              <DropdownMenuItem>Sort by Due Date</DropdownMenuItem>
              <DropdownMenuItem>Export Board</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex h-full gap-6">
            {columns.map((status) => (
              <div
                key={status}
                className="flex-1 min-w-[320px] flex flex-col rounded-lg"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="font-semibold text-sm">
                      {columnHeaders[status]}
                    </h3>
                    <span className="ml-2 text-xs bg-background rounded-full px-2 py-1">
                      {projectTasks.filter((task) => task.status === status).length}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-lg p-3 space-y-3 ${columnColors[status]}`}
                    >
                      {projectTasks
                        .filter((task) => task.status === status)
                        .map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`
                                  transform transition-transform duration-150
                                  ${snapshot.isDragging ? 'rotate-2 scale-105' : ''}
                                `}
                              >
                                <TaskCard 
                                  task={task} 
                                  onTaskUpdate={handleTaskUpdate}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
