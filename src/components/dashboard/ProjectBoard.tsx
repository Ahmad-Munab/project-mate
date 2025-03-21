'use client';

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MoreVertical, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import TaskCard from "./TaskCard";
import { tasks } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import TaskCreateDialog from "./TaskCreateDialog";

type Task = InferSelectModel<typeof tasks>;
type SortOption = 'title' | 'priority' | 'dueDate' | 'none';

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

const priorityOrder = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortTasks = (tasks: Task[]): Task[] => {
    const sortedTasks = [...tasks];
    
    switch (sortBy) {
      case 'title':
        sortedTasks.sort((a, b) => {
          const comparison = a.title.localeCompare(b.title);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
        break;
      
      case 'priority':
        sortedTasks.sort((a, b) => {
          const priorityA = priorityOrder[a.priority];
          const priorityB = priorityOrder[b.priority];
          const comparison = priorityA - priorityB;
          return sortDirection === 'asc' ? comparison : -comparison;
        });
        break;
      
      case 'dueDate':
        sortedTasks.sort((a, b) => {
          // Handle null dates
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return sortDirection === 'asc' ? 1 : -1;
          if (!b.due_date) return sortDirection === 'asc' ? -1 : 1;
          
          const dateA = new Date(a.due_date).getTime();
          const dateB = new Date(b.due_date).getTime();
          const comparison = dateA - dateB;
          return sortDirection === 'asc' ? comparison : -comparison;
        });
        break;
      
      default:
        // Default to sorting by creation date
        sortedTasks.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          const comparison = dateA - dateB;
          return sortDirection === 'asc' ? comparison : -comparison;
        });
    }
    
    return sortedTasks;
  };

  // Apply sorting whenever sort options or tasks change
  useEffect(() => {
    setProjectTasks(prev => sortTasks([...prev]));
  }, [sortBy, sortDirection]);

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
    setProjectTasks(prev =>
      sortTasks(prev.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      ))
    );
  };

  const handleTaskCreate = (newTask: Task) => {
    setProjectTasks(prevTasks => [...prevTasks, newTask]);
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
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setSortBy('title');
                toggleSortDirection();
              }}>
                Sort by A-Z {sortBy === 'title' && `(${sortDirection.toUpperCase()})`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortBy('priority');
                toggleSortDirection();
              }}>
                Sort by Priority {sortBy === 'priority' && `(${sortDirection.toUpperCase()})`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortBy('dueDate');
                toggleSortDirection();
              }}>
                Sort by Due Date {sortBy === 'dueDate' && `(${sortDirection.toUpperCase()})`}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setSortBy('none');
                setSortDirection('asc');
              }}>
                Reset Sort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {projectId && (
        <TaskCreateDialog
          projectId={projectId}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onTaskCreate={handleTaskCreate}
        />
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex h-full gap-6 min-w-fit">
            {columns.map((status) => (
              <div
                key={status}
                className="flex-1 min-w-[320px] max-w-[400px] flex flex-col h-full"
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
                      className={`flex-1 rounded-lg p-3 space-y-3 ${columnColors[status]} overflow-y-auto min-h-[200px] max-h-[calc(100vh-220px)]`}
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
