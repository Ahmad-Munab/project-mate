"use client";

import { useState, useEffect, useRef } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Plus, ArrowUpDown, ChevronLeft, ChevronRight, Settings } from "lucide-react";
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
import TaskStatusManageDialog from "./TaskStatusManageDialog";
import { usePermissions } from "@/hooks/usePermissions";

export type Task = InferSelectModel<typeof tasks>;

// Type for task status
export type TaskStatus = {
  id: string;
  project_id: string;
  name: string;
  key: string;
  color: string;
  is_default: boolean;
  order: number;
  created_at: string;
  updated_at: string;
};

// Default column colors (fallback)
const defaultColumnColors = {
  BACKLOG: "bg-gray-50 dark:bg-gray-900",
  ARCHITECTURE: "bg-purple-50 dark:bg-purple-900/20",
  FRONTEND: "bg-blue-50 dark:bg-blue-900/20",
  BACKEND: "bg-green-50 dark:bg-green-900/20",
  DATABASE: "bg-yellow-50 dark:bg-yellow-900/20",
  API: "bg-indigo-50 dark:bg-indigo-900/20",
  TESTING: "bg-red-50 dark:bg-red-900/20",
  DONE: "bg-emerald-50 dark:bg-emerald-900/20",
};

// Default column headers (fallback)
const defaultColumnHeaders = {
  BACKLOG: "Backlog",
  ARCHITECTURE: "Architecture",
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  DATABASE: "Database",
  API: "API",
  TESTING: "Testing",
  DONE: "Done",
};

/**
 * Get default task statuses as a fallback when API calls fail
 * @param projectId Project ID
 * @returns Array of default task statuses
 */
const getDefaultTaskStatuses = (projectId: string) => [
  {
    id: 'default-backlog',
    project_id: projectId,
    name: 'Backlog',
    key: 'BACKLOG',
    color: 'bg-gray-50 dark:bg-gray-900',
    is_default: true,
    order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-architecture',
    project_id: projectId,
    name: 'Architecture',
    key: 'ARCHITECTURE',
    color: 'bg-purple-50 dark:bg-purple-900/20',
    is_default: false,
    order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-frontend',
    project_id: projectId,
    name: 'Frontend',
    key: 'FRONTEND',
    color: 'bg-blue-50 dark:bg-blue-900/20',
    is_default: false,
    order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-backend',
    project_id: projectId,
    name: 'Backend',
    key: 'BACKEND',
    color: 'bg-green-50 dark:bg-green-900/20',
    is_default: false,
    order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-database',
    project_id: projectId,
    name: 'Database',
    key: 'DATABASE',
    color: 'bg-yellow-50 dark:bg-yellow-900/20',
    is_default: false,
    order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-api',
    project_id: projectId,
    name: 'API',
    key: 'API',
    color: 'bg-indigo-50 dark:bg-indigo-900/20',
    is_default: false,
    order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-testing',
    project_id: projectId,
    name: 'Testing',
    key: 'TESTING',
    color: 'bg-red-50 dark:bg-red-900/20',
    is_default: false,
    order: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-done',
    project_id: projectId,
    name: 'Done',
    key: 'DONE',
    color: 'bg-emerald-50 dark:bg-emerald-900/20',
    is_default: false,
    order: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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

/**
 * Fetch task statuses for a project with robust error handling
 * @param projectId Project ID
 * @returns Array of task statuses
 */
async function fetchProjectTaskStatuses(projectId: string) {
  try {
    console.log('Fetching task statuses for project:', projectId);

    if (!projectId) {
      console.error('Project ID is required');
      return getDefaultTaskStatuses('default');
    }

    // First check if we already have statuses
    let statuses = [];

    try {
      // Fetch existing statuses
      const response = await fetch(`/api/projects/${projectId}/task-statuses`);

      if (response.ok) {
        statuses = await response.json();
        console.log('Fetched statuses:', statuses.length);
      } else {
        console.warn('Failed to fetch task statuses, will try to initialize');
      }
    } catch (fetchError) {
      console.warn('Error fetching task statuses, will try to initialize:', fetchError);
    }

    // If we have statuses, return them
    if (statuses && statuses.length > 0) {
      return statuses;
    }

    // If no statuses exist, try to initialize them
    console.log('No statuses found, will initialize default ones');

    try {
      // Try up to 3 times to initialize statuses
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Initializing statuses (attempt ${attempt}/3)...`);
          const initResponse = await fetch(`/api/projects/${projectId}/task-statuses/initialize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (initResponse.ok) {
            const newStatuses = await initResponse.json();
            console.log('Successfully initialized statuses:', newStatuses.length);

            // If we got statuses back, return them
            if (newStatuses && newStatuses.length > 0) {
              return newStatuses;
            }

            // If we didn't get any statuses, try again or use defaults
            console.warn('Initialization returned 0 statuses, will retry or use defaults');
          } else {
            const errorText = await initResponse.text();
            console.warn(`Initialization failed (attempt ${attempt}/3): ${errorText}`);
          }

          // Wait a bit before retrying
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        } catch (attemptError) {
          console.warn(`Initialization attempt ${attempt}/3 failed:`, attemptError);

          // Wait a bit before retrying
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        }
      }

      // If we get here, all initialization attempts failed
      console.error('All initialization attempts failed, using default statuses');
      return getDefaultTaskStatuses(projectId);
    } catch (initError) {
      console.error('Error during status initialization process:', initError);
      return getDefaultTaskStatuses(projectId);
    }
  } catch (error) {
    console.error("Unexpected error in fetchProjectTaskStatuses:", error);
    return getDefaultTaskStatuses(projectId); // Return default statuses as fallback
  }
}

/**
 * Updates a task's status
 * @param taskId Task ID
 * @param newStatus New status
 * @returns Updated task
 */
async function updateTaskStatus(taskId: string, newStatus: string) {
  try {
    // Validate the status is not empty
    if (!newStatus) {
      throw new Error("Status cannot be empty");
    }

    // Make the API call
    const response = await fetch("/api/tasks/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId,
        status: newStatus,
        status_key: newStatus,
      }),
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update task status");
    }

    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error("Error in updateTaskStatus:", error);
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
  isOwner,
}: {
  projectId?: string;
  initialTasks: Task[];
  isOwner: boolean;
}) {
  const { can, permissions, role } = usePermissions(projectId);

  // Determine if user is a manager based on role or permissions
  const userIsManager = role === "MANAGER" || permissions?.canManageProject === true;

  // Modify permission checks to allow owners and managers
  const canCreateTasks = isOwner || userIsManager || can("createTasks") || can("canEdit");
  const canInviteMembers = isOwner || userIsManager || can("inviteMembers") || can("canInvite");
  const canDragTasks = isOwner || userIsManager || can("editTasks") || can("canEdit");

  const [projectTasks, setProjectTasks] = useState<Task[]>(initialTasks);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isStatusManageDialogOpen, setIsStatusManageDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "MANAGER">("MEMBER");
  const boardRef = useRef<HTMLDivElement>(null);

  // Mobile responsive state
  const [activeColumn, setActiveColumn] = useState<string>("TODO");
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);


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

      // First fetch tasks
      fetchProjectTasks(projectId)
        .then(tasks => {
          setProjectTasks(tasks);

          // Then fetch task statuses
          return fetchProjectTaskStatuses(projectId)
            .then(statuses => {
              console.log('Successfully fetched task statuses:', statuses);
              setTaskStatuses(statuses);

              // Set active column for mobile view to the first status
              if (statuses.length > 0) {
                setActiveColumn(statuses[0].key);
              }
            })
            .catch(error => {
              console.error("Error fetching task statuses:", error);
              toast.error("Failed to load task statuses");

              // Set default statuses as fallback
              const defaultStatuses = getDefaultTaskStatuses(projectId);
              setTaskStatuses(defaultStatuses);
              setActiveColumn('BACKLOG');
            });
        })
        .catch(error => {
          console.error("Error loading project tasks:", error);
          toast.error("Failed to load project tasks");
        })
        .finally(() => setIsLoading(false));
    }
  }, [projectId]);

  const handleTaskUpdate = async (updatedTask: Task) => {
    if (!isOwner && !userIsManager && !can("canEdit")) {
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
    if (!isOwner && !userIsManager && !can("canDelete")) {
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

  /**
   * Handles the end of a drag operation
   */
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Return if no destination or if dropped in the same place
    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    // Check permissions before allowing drag
    const hasPermission = isOwner || userIsManager || can("canEdit") || can("editTasks");
    if (!hasPermission) {
      toast.error("You don't have permission to move tasks");
      return;
    }

    const newStatus = destination.droppableId;
    const taskId = draggableId;

    // Validate the new status
    if (!newStatus) {
      toast.error("Invalid destination column");
      return;
    }

    // Find the task being moved
    const taskToMove = projectTasks.find(task => task.id === taskId);
    if (!taskToMove) {
      toast.error("Task not found");
      return;
    }

    // Store the original tasks state in case we need to revert
    const originalTasks = [...projectTasks];

    try {
      console.log(`Moving task ${taskId} to ${newStatus}`);

      // Optimistically update the UI
      setProjectTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: newStatus as Task["status"],
                status_key: newStatus
              }
            : task
        )
      );

      // Make the API call to update the status
      await updateTaskStatus(taskId, newStatus);

      // Show success message
      const targetColumnName = taskStatuses.find(s => s.key === newStatus)?.name || newStatus;
      toast.success(`Moved "${taskToMove.title}" to ${targetColumnName}`);
    } catch (err) {
      console.error('Error updating task status:', err);
      toast.error(err instanceof Error ? err.message : "Failed to update task status");

      // Revert to the original state if the API call fails
      setProjectTasks(originalTasks);
    }
  };

  // Navigate to next/previous column on mobile
  const navigateColumn = (direction: 'next' | 'prev') => {
    const columns = taskStatuses.map(status => status.key);
    const currentIndex = columns.indexOf(activeColumn);

    if (direction === 'next' && currentIndex < columns.length - 1) {
      setActiveColumn(columns[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      setActiveColumn(columns[currentIndex - 1]);
    }
  };

  // Handle task status changes
  const handleTaskStatusesChange = async () => {
    if (projectId) {
      try {
        const statuses = await fetchProjectTaskStatuses(projectId);
        setTaskStatuses(statuses);
      } catch (error) {
        console.error("Error refreshing task statuses:", error);
        toast.error("Failed to refresh task statuses");

        // Keep using the current statuses
        // If there are no statuses, use default ones
        if (taskStatuses.length === 0) {
          const defaultStatuses = getDefaultTaskStatuses(projectId);
          setTaskStatuses(defaultStatuses);
        }
      }
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

  // Get column keys from task statuses
  const columns = taskStatuses.map(status => status.key);

  // Create a mapping of status keys to display names
  const columnHeaders = taskStatuses.reduce((acc, status) => {
    acc[status.key] = status.name;
    return acc;
  }, {} as Record<string, string>);

  // Create a mapping of status keys to colors
  const columnColors = taskStatuses.reduce((acc, status) => {
    acc[status.key] = status.color;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="h-full flex flex-col" ref={boardRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 border-b gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Project Board</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage and track your project tasks
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {canCreateTasks && (
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(true)}
              className="text-xs md:text-sm h-8 md:h-10"
            >
              <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              Add Task
            </Button>
          )}
          {canInviteMembers && (
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(true)}
              className="text-xs md:text-sm h-8 md:h-10"
            >
              Invite Members
            </Button>
          )}
          {(isOwner || userIsManager) && (
            <Button
              variant="outline"
              onClick={() => setIsStatusManageDialogOpen(true)}
              className="text-xs md:text-sm h-8 md:h-10"
            >
              <Settings className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              Manage Columns
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                <ArrowUpDown className="h-3 w-3 md:h-4 md:w-4" />
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

      {/* Mobile Column Navigation */}
      {isMobile && taskStatuses.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateColumn('prev')}
            disabled={activeColumn === columns[0]}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h3 className="font-medium text-sm">
            {columnHeaders[activeColumn] || defaultColumnHeaders[activeColumn as keyof typeof defaultColumnHeaders] || activeColumn}
            <span className="ml-2 text-xs bg-background rounded-full px-2 py-1">
              {projectTasks.filter((task) =>
                task.status_key === activeColumn ||
                (task.status === activeColumn && !task.status_key)
              ).length}
            </span>
          </h3>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateColumn('next')}
            disabled={activeColumn === columns[columns.length - 1]}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

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

      {/* Task Status Management Dialog */}
      {projectId && (
        <TaskStatusManageDialog
          projectId={projectId}
          open={isStatusManageDialogOpen}
          onOpenChange={setIsStatusManageDialogOpen}
          onStatusesChange={handleTaskStatusesChange}
        />
      )}

      {projectId && (
        <TaskCreateDialog
          projectId={projectId}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onTaskCreate={handleTaskCreate}
          taskStatuses={taskStatuses}
        />
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto p-4 md:p-6">
          <div className={`flex h-full ${isMobile ? 'flex-col' : 'flex-row'} gap-4 md:gap-6 ${!isMobile && 'min-w-fit'}`}>
            {isMobile ? (
              // Mobile view - show only active column
              <div
                key={activeColumn}
                className="flex-1 min-h-[calc(100vh-220px)] flex flex-col"
              >
                <Droppable droppableId={activeColumn}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-lg p-3 space-y-3 ${columnColors[activeColumn] || defaultColumnColors[activeColumn as keyof typeof defaultColumnColors] || 'bg-gray-50 dark:bg-gray-900'} overflow-y-auto min-h-[200px]`}
                    >
                      {projectTasks
                        .filter((task) =>
                          task.status_key === activeColumn ||
                          (task.status === activeColumn && !task.status_key)
                        )
                        .map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                            isDragDisabled={!(isOwner || userIsManager || canDragTasks)}
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
                                  taskStatuses={taskStatuses}
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
            ) : (
              // Desktop view - show all columns
              taskStatuses.map((status) => (
                <div
                  key={status.key}
                  className="flex-1 min-w-[280px] md:min-w-[320px] md:max-w-[400px] flex flex-col h-full"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-sm">
                        {status.name}
                      </h3>
                      <span className="ml-2 text-xs bg-background rounded-full px-2 py-1">
                        {
                          projectTasks.filter((task) =>
                            task.status_key === status.key ||
                            (task.status === status.key && !task.status_key)
                          ).length
                        }
                      </span>
                    </div>
                    {canCreateTasks && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Droppable droppableId={status.key}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-lg p-3 space-y-3 ${status.color} overflow-y-auto min-h-[200px] max-h-[calc(100vh-220px)]`}
                      >
                        {projectTasks
                          .filter((task) =>
                            task.status_key === status.key ||
                            (task.status === status.key && !task.status_key)
                          )
                          .map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={!(isOwner || userIsManager || canDragTasks)}
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
                                    taskStatuses={taskStatuses}
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
              ))
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
