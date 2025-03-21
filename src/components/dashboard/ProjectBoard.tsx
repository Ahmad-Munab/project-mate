'use client';

import { db } from "@/db";
import { tasks, taskStatusEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import TaskCard from "./TaskCard";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState, useEffect } from "react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  project_id: string;
  created_by: string;
  created_at: Date | null;
  due_date: Date | null;
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

  const columns = Object.values(taskStatusEnum.enumValues);

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
    <div className="h-full p-6">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-4">
          {columns.map((status) => (
            <div
              key={status}
              className="flex-1 min-w-[280px] bg-card rounded-lg p-4"
            >
              <h3 className="font-medium mb-4 text-muted-foreground">
                {status.replace(/_/g, " ")}
              </h3>
              <Droppable droppableId={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3 min-h-[200px]"
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
                              className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
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
      </DragDropContext>
    </div>
  );
}
