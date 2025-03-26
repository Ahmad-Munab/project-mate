"use client";

import { useState, useEffect, useRef } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import TaskCard from "./TaskCard";
import { tasks } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import TaskCreateDialog from "./TaskCreateDialog";
import { usePermissions } from "@/hooks/usePermissions";

export type Task = InferSelectModel<typeof tasks>;

// Constants
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

// Helper functions
async function fetchProjectTasks(projectId: string) {
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

async function updateTaskStatus(taskId: string, newStatus: string) {
  try {
    const response = await fetch("/api/tasks/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId,
        status: newStatus,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update task status");
    }
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
}

const sortTasks = (
  tasks: Task[],
  sortBy: string,
  sortDirection: "asc" | "desc"
) => {
  return [...tasks].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return sortDirection === "asc"
          ? (a.title || "").localeCompare(b.title || "")
          : (b.title || "").localeCompare(a.title || "");

      case "priority":
        const aValue = priorityOrder[a.priority] || 0;
        const bValue = priorityOrder[b.priority] || 0;
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;

      case "dueDate":
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return sortDirection === "asc" ? 1 : -1;
        if (!b.due_date) return sortDirection === "asc" ? -1 : 1;
        const aDate = new Date(a.due_date).getTime();
        const bDate = new Date(b.due_date).getTime();
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;

      default: // createdAt
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    }
  });
};

export default function ProjectBoard({
  projectId,
  initialTasks,
  isOwner, // Add this prop
}: {
  projectId?: string;
  initialTasks: Task[];
  isOwner: boolean;
}) {
  const { can } = usePermissions();
  
  // Modify permission checks to allow owners
  const canCreateTasks = isOwner || can("canEdit");
  const canInviteMembers = isOwner || can("canInvite");
  const canDragTasks = isOwner || can("canEdit");

  const [projectTasks, setProjectTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "MANAGER">("MEMBER");
  const boardRef = useRef<HTMLDivElement>(null);

  // Add function to handle invite link creation
  const createInviteLink = async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: inviteRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to create invite link");
      }

      const { inviteUrl } = await response.json();

      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard");

      setIsInviteDialogOpen(false);
    } catch (error) {
      console.error("Error creating invite:", error);
      toast.error("Failed to create invite link");
    }
  };

  // Toggle sort direction helper
  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  useEffect(() => {
    setProjectTasks((prev) => sortTasks(prev, sortBy, sortDirection));
  }, [sortBy, sortDirection]);

  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      fetchProjectTasks(projectId)
        .then((tasks) => setProjectTasks(tasks))
        .finally(() => setIsLoading(false));
    }
  }, [projectId]);

  const handleTaskUpdate = async (updatedTask: Task) => {
    if (!isOwner && !can("canEdit")) {
      toast.error("You don't have permission to edit tasks");
      return;
    }

    try {
      setProjectTasks((prev) =>
        sortTasks(
          prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
          sortBy,
          sortDirection
        )
      );
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleTaskCreate = (newTask: Task) => {
    setProjectTasks((prev) =>
      sortTasks([...prev, newTask], sortBy, sortDirection)
    );
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!isOwner && !can("canDelete")) {
      toast.error("You don't have permission to delete tasks");
      return;
    }

    try {
      setProjectTasks((prevTasks) =>
        prevTasks.filter((task) => task.id !== taskId)
      );
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    const newStatus = destination.droppableId;
    const taskId = draggableId;

    try {
      setProjectTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? { ...task, status: newStatus as Task["status"] }
            : task
        )
      );

      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error("Failed to update task status:", error);
      setProjectTasks(initialTasks);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a project to view tasks</p>
      </div>
    );
  }

  const columns = Object.keys(columnHeaders) as Array<
    keyof typeof columnHeaders
  >;

  return (
    <div className="h-full flex flex-col" ref={boardRef}>
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold">Project Board</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your project tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateTasks && (
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
          {canInviteMembers && (
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
              Invite Members
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSortBy("title");
                  toggleSortDirection();
                }}
              >
                Sort by A-Z{" "}
                {sortBy === "title" && `(${sortDirection.toUpperCase()})`}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortBy("priority");
                  toggleSortDirection();
                }}
              >
                Sort by Priority{" "}
                {sortBy === "priority" && `(${sortDirection.toUpperCase()})`}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortBy("dueDate");
                  toggleSortDirection();
                }}
              >
                Sort by Due Date{" "}
                {sortBy === "dueDate" && `(${sortDirection.toUpperCase()})`}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSortBy("none");
                  setSortDirection("asc");
                }}
              >
                Reset Sort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={inviteRole}
              onValueChange={(value: "MANAGER" | "MEMBER") =>
                setInviteRole(value)
              }
            >
              <option value="MEMBER">Member</option>
              <option value="MANAGER">Manager</option>
            </Select>
            <Button onClick={createInviteLink}>Generate Invite Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      {projectId && (
        <TaskCreateDialog
          projectId={projectId}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onTaskCreate={handleTaskCreate}
        />
      )}

      <DragDropContext onDragEnd={(isOwner || canDragTasks) ? onDragEnd : () => {}}>
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
                      {
                        projectTasks.filter((task) => task.status === status)
                          .length
                      }
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
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard
                                  task={task}
                                  onTaskUpdate={handleTaskUpdate}
                                  onTaskDelete={handleTaskDelete}
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
