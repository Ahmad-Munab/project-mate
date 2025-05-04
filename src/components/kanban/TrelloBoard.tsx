"use client";

import { useState, useEffect } from "react";
import { DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Task } from "./types";
import { useBoardData } from "./hooks/useBoardData";
import TrelloBoardContent from "./components/TrelloBoardContent";
import TaskDialog from "./dialogs/TaskDialog";
import BackgroundDialog from "./dialogs/BackgroundDialog";
import SortMenu from "./components/SortMenu";
import { Button } from "@/components/ui/button";
import { Search, Settings, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import "./styles/dragStyles.css";

interface TrelloBoardProps {
  projectId: string;
  initialTasks: Task[];
  isOwner: boolean;
  projectName?: string;
}

export default function TrelloBoard({
  projectId,
  initialTasks,
  isOwner,
  projectName = "Project Board",
}: TrelloBoardProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBackgroundDialogOpen, setIsBackgroundDialogOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [background, setBackground] = useState<{ type: string; value: string }>({
    type: "color",
    value: "#0079bf"
  });

  // Load background from localStorage on component mount
  useEffect(() => {
    const savedBackground = localStorage.getItem(`board-background-${projectId}`);
    if (savedBackground) {
      try {
        const parsedBackground = JSON.parse(savedBackground);
        setBackground(parsedBackground);
      } catch (error) {
        console.error("Error parsing saved background:", error);
      }
    }
  }, [projectId]);

  // Use custom hook for board data
  const {
    projectTasks,
    setProjectTasks,
    taskStatuses,
    setTaskStatuses,
    handleTaskUpdate,
    handleTaskCreate,
    handleTaskDelete,
    sortBy,
    sortDirection,
    applySorting: hookApplySorting,
  } = useBoardData({ projectId, initialTasks });

  // Wrapper for sorting function to ensure it updates filtered tasks too
  const applySorting = (field: string, direction: "asc" | "desc") => {
    console.log("TrelloBoard: applySorting called with", field, direction);

    try {
      // Apply sorting to all tasks
      hookApplySorting(field, direction);

      // After sorting is applied, projectTasks will be updated
      // Now we need to update filtered tasks based on the current projectTasks
      if (searchQuery) {
        // If we have a search filter, apply it to the project tasks
        const filtered = projectTasks.filter(
          (task) =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description &&
              task.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setFilteredTasks(filtered);
      } else {
        // Otherwise, use all project tasks
        setFilteredTasks([...projectTasks]);
      }

      // Success message is already shown in the hookApplySorting function
    } catch (error) {
      console.error("Error applying sorting:", error);
      toast.error("Failed to sort tasks");
    }
  };

  // State for filtered tasks
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(projectTasks);

  // Apply filter function (called when Enter is pressed)
  const applyFilter = () => {
    if (searchQuery) {
      // Filter tasks without changing their order
      const filtered = [...projectTasks].filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description &&
            task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredTasks(filtered);
      toast.success(`Filtered to ${filtered.length} tasks`);
    } else {
      // If search query is empty, show all tasks without changing order
      setFilteredTasks([...projectTasks]);
    }
  };

  // Reset filters
  const resetFilters = () => {
    // Reset to current project tasks without changing order
    setFilteredTasks([...projectTasks]);
    setSearchQuery("");
    toast.success("Filters cleared");
  };

  // Initialize filtered tasks when component mounts
  useEffect(() => {
    // Initialize filtered tasks with project tasks
    setFilteredTasks(projectTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update filtered tasks when projectTasks or searchQuery changes
  useEffect(() => {
    console.log("projectTasks or searchQuery changed, updating filteredTasks");

    // If we have a search query, apply the filter
    if (searchQuery) {
      const filtered = projectTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description &&
            task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredTasks(filtered);
    } else {
      // Otherwise, show all tasks
      setFilteredTasks(projectTasks);
    }
  }, [projectTasks, searchQuery]);

  // Handle drag and drop - using Trello-like approach for smooth transitions
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    // Return if no destination or if dropped in the same place
    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    // Check permissions
    if (!isOwner) {
      toast.error("You don't have permission to move items");
      return;
    }

    // Handle column reordering
    if (type === "COLUMN") {
      // Extract column ID from draggableId (format: "column-{id}")
      const columnId = draggableId.replace("column-", "");

      // Find the column being moved
      const columnToMove = taskStatuses.find((col) => col.id === columnId);
      if (!columnToMove) {
        toast.error("Column not found");
        return;
      }

      // Prevent moving the BACKLOG column
      if (columnToMove.key === "BACKLOG" || columnToMove.is_default) {
        toast.error("Cannot move the Backlog column");
        return;
      }

      // Store original columns state in case we need to revert
      const originalColumns = [...taskStatuses];

      try {
        // Get all columns sorted by order
        const sortedColumns = [...taskStatuses].sort((a, b) => a.order - b.order);

        // Find the backlog column
        const backlogColumn = sortedColumns.find(col => col.key === "BACKLOG" || col.is_default);

        // Remove the backlog column and the column being moved
        const otherColumns = sortedColumns.filter(col =>
          col.id !== columnId && !(col.key === "BACKLOG" || col.is_default)
        );

        // Create a new array with the backlog column first, then the other columns
        let reorderedColumns = backlogColumn ? [backlogColumn] : [];

        // Insert the moved column at the new position (adjusting for backlog)
        // The destination index needs to be adjusted because backlog is always first
        const adjustedIndex = Math.max(0, destination.index - (backlogColumn ? 1 : 0));

        // Insert the moved column at the adjusted position
        otherColumns.splice(adjustedIndex, 0, columnToMove);

        // Combine the arrays
        reorderedColumns = [...reorderedColumns, ...otherColumns];

        // Update the order property for each column
        const updatedColumns = reorderedColumns.map((col, index) => ({
          ...col,
          order: index
        }));

        // Optimistically update the UI
        setTaskStatuses(updatedColumns);

        // Update the column order in the database
        await handleColumnReorder(columnId, adjustedIndex + (backlogColumn ? 1 : 0));

        toast.success(`Moved column "${columnToMove.name}"`);
      } catch (error) {
        console.error("Error reordering columns:", error);
        toast.error("Failed to reorder columns");

        // Revert to original state if the API call fails
        setTaskStatuses(originalColumns);
      }

      return;
    }

    // Get source and destination column IDs
    const sourceStatus = source.droppableId;
    const destinationStatus = destination.droppableId;
    const taskId = draggableId;

    // Check if task is being moved within the same column (reordering)
    if (sourceStatus === destinationStatus) {
      console.log("REORDERING WITHIN SAME COLUMN", sourceStatus);
      console.log("From index", source.index, "to index", destination.index);

      // Get all tasks in the current column
      const tasksInColumn: Task[] = [];
      const tasksInColumnIndices: number[] = [];

      // Find all tasks in this column and their indices
      projectTasks.forEach((task, index) => {
        if (
          task.status_key === sourceStatus ||
          (task.status === sourceStatus && !task.status_key)
        ) {
          tasksInColumn.push(task);
          tasksInColumnIndices.push(index);
        }
      });

      console.log("Tasks in column before reordering:", tasksInColumn);

      // Get the task being moved
      const taskToMove = tasksInColumn[source.index];
      if (!taskToMove) {
        console.error("Task not found for reordering");
        return;
      }

      // Create a new array with the task moved to the new position
      const reorderedColumnTasks = [...tasksInColumn];
      reorderedColumnTasks.splice(source.index, 1);
      reorderedColumnTasks.splice(destination.index, 0, taskToMove);

      console.log("Tasks in column after reordering:", reorderedColumnTasks);

      // Create a completely new array for all tasks
      const allTasks: Task[] = [];

      // Add all tasks that are not in this column
      projectTasks.forEach((task, index) => {
        if (
          task.status_key !== sourceStatus &&
          !(task.status === sourceStatus && !task.status_key)
        ) {
          allTasks.push(task);
        }
      });

      // Find the position where the column tasks were
      const insertPosition = tasksInColumnIndices.length > 0 ?
        Math.min(...tasksInColumnIndices) : allTasks.length;

      // Insert the reordered column tasks at that position
      for (let i = 0; i < reorderedColumnTasks.length; i++) {
        allTasks.splice(insertPosition + i, 0, reorderedColumnTasks[i]);
      }

      console.log("All tasks after reordering:", allTasks);

      // Update the state with the new tasks array
      setProjectTasks(allTasks);

      // Handle filtered tasks if needed
      if (filteredTasks.length !== projectTasks.length) {
        // Get all filtered tasks in this column
        const filteredTasksInColumn: Task[] = [];
        const filteredTasksInColumnIndices: number[] = [];

        // Find all filtered tasks in this column and their indices
        filteredTasks.forEach((task, index) => {
          if (
            task.status_key === sourceStatus ||
            (task.status === sourceStatus && !task.status_key)
          ) {
            filteredTasksInColumn.push(task);
            filteredTasksInColumnIndices.push(index);
          }
        });

        // Create a new array with the filtered task moved to the new position
        const reorderedFilteredColumnTasks = [...filteredTasksInColumn];

        // Find the task in the filtered tasks
        const filteredTaskIndex = filteredTasksInColumn.findIndex(t => t.id === taskToMove.id);

        // Only reorder if the task is in the filtered view
        if (filteredTaskIndex !== -1) {
          // Remove the task from its current position
          reorderedFilteredColumnTasks.splice(filteredTaskIndex, 1);

          // Calculate the new position in the filtered view
          let newFilteredIndex = destination.index;
          if (filteredTaskIndex < destination.index) {
            newFilteredIndex = Math.min(destination.index, reorderedFilteredColumnTasks.length);
          }

          // Insert the task at the new position
          reorderedFilteredColumnTasks.splice(newFilteredIndex, 0, taskToMove);

          // Create a completely new array for all filtered tasks
          const allFilteredTasks: Task[] = [];

          // Add all filtered tasks that are not in this column
          filteredTasks.forEach((task) => {
            if (
              task.status_key !== sourceStatus &&
              !(task.status === sourceStatus && !task.status_key)
            ) {
              allFilteredTasks.push(task);
            }
          });

          // Find the position where the column tasks were
          const insertFilteredPosition = filteredTasksInColumnIndices.length > 0 ?
            Math.min(...filteredTasksInColumnIndices) : allFilteredTasks.length;

          // Insert the reordered column tasks at that position
          for (let i = 0; i < reorderedFilteredColumnTasks.length; i++) {
            allFilteredTasks.splice(insertFilteredPosition + i, 0, reorderedFilteredColumnTasks[i]);
          }

          console.log("All filtered tasks after reordering:", allFilteredTasks);

          // Update the filtered tasks state
          setFilteredTasks(allFilteredTasks);
        }
      }

      return;
    }

    // Handle task movement between columns
    const newStatus = destinationStatus;

    // Validate the new status
    if (!newStatus) {
      toast.error("Invalid destination column");
      return;
    }

    // Find the task being moved
    const taskToMove = projectTasks.find((task) => task.id === taskId);
    if (!taskToMove) {
      toast.error("Task not found");
      return;
    }

    // Store the original tasks state in case we need to revert
    const originalTasks = [...projectTasks];

    try {
      console.log("MOVING TASK BETWEEN COLUMNS", sourceStatus, "->", destinationStatus);

      // Find the task in the filtered tasks
      const taskInFilteredTasks = filteredTasks.find(task => task.id === taskId);

      // Create updated task with new status
      const updatedTask = {
        ...taskToMove,
        status: newStatus as Task["status"],
        status_key: newStatus,
      };

      // Get all tasks in the source column
      const sourceColumnTasks: Task[] = [];
      const sourceColumnIndices: number[] = [];

      // Find all tasks in source column and their indices
      projectTasks.forEach((task, index) => {
        if (
          task.status_key === sourceStatus ||
          (task.status === sourceStatus && !task.status_key)
        ) {
          sourceColumnTasks.push(task);
          sourceColumnIndices.push(index);
        }
      });

      // Get all tasks in the destination column
      const destColumnTasks: Task[] = [];
      const destColumnIndices: number[] = [];

      // Find all tasks in destination column and their indices
      projectTasks.forEach((task, index) => {
        if (
          task.status_key === destinationStatus ||
          (task.status === destinationStatus && !task.status_key)
        ) {
          destColumnTasks.push(task);
          destColumnIndices.push(index);
        }
      });

      console.log("Source column tasks:", sourceColumnTasks);
      console.log("Destination column tasks:", destColumnTasks);

      // Create a completely new array for all tasks
      const allTasks: Task[] = [];

      // Add all tasks that are not in source or destination columns
      projectTasks.forEach((task) => {
        if (
          (task.status_key !== sourceStatus &&
           !(task.status === sourceStatus && !task.status_key)) &&
          (task.status_key !== destinationStatus &&
           !(task.status === destinationStatus && !task.status_key))
        ) {
          allTasks.push(task);
        }
      });

      // Remove the task from source column
      const sourceTasksWithoutMoved = sourceColumnTasks.filter(task => task.id !== taskId);

      // Add the task to destination column at the specified index
      const destTasksWithAdded = [...destColumnTasks];
      destTasksWithAdded.splice(destination.index, 0, updatedTask);

      // Find the position where the source column tasks were
      const sourceInsertPosition = sourceColumnIndices.length > 0 ?
        Math.min(...sourceColumnIndices) : allTasks.length;

      // Insert the source column tasks (without the moved task)
      for (let i = 0; i < sourceTasksWithoutMoved.length; i++) {
        allTasks.splice(sourceInsertPosition + i, 0, sourceTasksWithoutMoved[i]);
      }

      // Find the position where the destination column tasks were
      const destInsertPosition = destColumnIndices.length > 0 ?
        Math.min(...destColumnIndices) : allTasks.length;

      // Adjust the position if destination comes after source
      const adjustedDestPosition = destInsertPosition > sourceInsertPosition && sourceTasksWithoutMoved.length < sourceColumnTasks.length
        ? destInsertPosition - 1 // Adjust for the removed task
        : destInsertPosition;

      // Insert the destination column tasks (with the added task)
      for (let i = 0; i < destTasksWithAdded.length; i++) {
        allTasks.splice(adjustedDestPosition + i, 0, destTasksWithAdded[i]);
      }

      console.log("All tasks after moving:", allTasks);

      // Update the state with the new tasks array
      setProjectTasks(allTasks);

      // Handle filtered tasks if needed
      if (filteredTasks.length !== projectTasks.length && taskInFilteredTasks) {
        // Similar process for filtered tasks
        const filteredSourceColumnTasks: Task[] = [];
        const filteredSourceIndices: number[] = [];

        filteredTasks.forEach((task, index) => {
          if (
            task.status_key === sourceStatus ||
            (task.status === sourceStatus && !task.status_key)
          ) {
            filteredSourceColumnTasks.push(task);
            filteredSourceIndices.push(index);
          }
        });

        const filteredDestColumnTasks: Task[] = [];
        const filteredDestIndices: number[] = [];

        filteredTasks.forEach((task, index) => {
          if (
            task.status_key === destinationStatus ||
            (task.status === destinationStatus && !task.status_key)
          ) {
            filteredDestColumnTasks.push(task);
            filteredDestIndices.push(index);
          }
        });

        const allFilteredTasks: Task[] = [];

        filteredTasks.forEach((task) => {
          if (
            (task.status_key !== sourceStatus &&
             !(task.status === sourceStatus && !task.status_key)) &&
            (task.status_key !== destinationStatus &&
             !(task.status === destinationStatus && !task.status_key))
          ) {
            allFilteredTasks.push(task);
          }
        });

        const filteredSourceTasksWithoutMoved = filteredSourceColumnTasks.filter(task => task.id !== taskId);

        const filteredDestTasksWithAdded = [...filteredDestColumnTasks];
        filteredDestTasksWithAdded.splice(destination.index, 0, updatedTask);

        const filteredSourceInsertPosition = filteredSourceIndices.length > 0 ?
          Math.min(...filteredSourceIndices) : allFilteredTasks.length;

        for (let i = 0; i < filteredSourceTasksWithoutMoved.length; i++) {
          allFilteredTasks.splice(filteredSourceInsertPosition + i, 0, filteredSourceTasksWithoutMoved[i]);
        }

        const filteredDestInsertPosition = filteredDestIndices.length > 0 ?
          Math.min(...filteredDestIndices) : allFilteredTasks.length;

        const adjustedFilteredDestPosition = filteredDestInsertPosition > filteredSourceInsertPosition && filteredSourceTasksWithoutMoved.length < filteredSourceColumnTasks.length
          ? filteredDestInsertPosition - 1
          : filteredDestInsertPosition;

        for (let i = 0; i < filteredDestTasksWithAdded.length; i++) {
          allFilteredTasks.splice(adjustedFilteredDestPosition + i, 0, filteredDestTasksWithAdded[i]);
        }

        console.log("All filtered tasks after moving:", allFilteredTasks);

        setFilteredTasks(allFilteredTasks);
      }

      // Make the API call to update the status
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

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      // Task moved successfully
    } catch (err) {
      console.error("Error updating task status:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update task status"
      );

      console.error("Reverting to original task state due to error");

      // Make a deep copy of the original tasks to avoid reference issues
      const originalTasksCopy = JSON.parse(JSON.stringify(originalTasks));

      // Revert to the original state if the API call fails
      setProjectTasks(originalTasksCopy);

      // Also revert filtered tasks to maintain consistency
      if (filteredTasks.length !== projectTasks.length) {
        // Create a new array of filtered tasks based on original tasks
        const revertedFilteredTasks: Task[] = [];

        // For each filtered task, find its original version
        filteredTasks.forEach(task => {
          const originalTask = originalTasks.find(t => t.id === task.id);
          if (originalTask) {
            // Make a deep copy to avoid reference issues
            revertedFilteredTasks.push(JSON.parse(JSON.stringify(originalTask)));
          }
        });

        console.log("Reverting filtered tasks to:", revertedFilteredTasks);
        setFilteredTasks(revertedFilteredTasks);
      }
    }
  };

  // Handle column update
  const handleColumnUpdate = async (columnId: string, name: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/task-statuses/${columnId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update column");
      }

      // Update local state
      setTaskStatuses((prev) =>
        prev.map((status) =>
          status.id === columnId ? { ...status, name } : status
        )
      );
    } catch (error) {
      console.error("Error updating column:", error);
      throw error;
    }
  };

  // Handle column delete
  const handleColumnDelete = async (columnId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/task-statuses/${columnId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete column");
      }

      // Update local state
      setTaskStatuses((prev) => prev.filter((status) => status.id !== columnId));
    } catch (error) {
      console.error("Error deleting column:", error);
      toast.error("Failed to delete column");
    }
  };

  // Handle column add
  const handleColumnAdd = async (name: string) => {
    try {
      // Get all columns sorted by order
      const sortedColumns = [...taskStatuses].sort((a, b) => a.order - b.order);

      // Find the backlog column
      const backlogColumn = sortedColumns.find(col => col.key === "BACKLOG" || col.is_default);

      // Determine the new order value
      // If backlog exists, set order to be right after backlog
      // Otherwise, set order to be after the last column
      let newOrder;

      if (backlogColumn) {
        // Find the index of the backlog column
        const backlogIndex = sortedColumns.findIndex(col => col.id === backlogColumn.id);

        // If backlog is the last column, set order to backlog.order + 1
        // Otherwise, set order to be between backlog and the next column
        if (backlogIndex === sortedColumns.length - 1) {
          newOrder = backlogColumn.order + 1;
        } else {
          newOrder = backlogColumn.order + 1;

          // Update the order of all columns after backlog
          for (let i = backlogIndex + 1; i < sortedColumns.length; i++) {
            const col = sortedColumns[i];
            await handleColumnReorder(col.id, col.order + 1);
          }
        }
      } else {
        // No backlog column, set order to be after the last column
        const maxOrder = sortedColumns.reduce(
          (max, status) => (status.order > max ? status.order : max),
          -1
        );
        newOrder = maxOrder + 1;
      }

      // Generate a key from the name (uppercase, replace spaces with underscores)
      const key = name.toUpperCase().replace(/\s+/g, '_');

      const response = await fetch(`/api/projects/${projectId}/task-statuses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          key,
          color: "bg-gray-50 dark:bg-gray-900",
          order: newOrder,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create column");
      }

      const newStatus = await response.json();

      // Update the local state
      setTaskStatuses((prev) => {
        const updated = [...prev, newStatus];
        return updated.sort((a, b) => a.order - b.order);
      });
    } catch (error) {
      console.error("Error creating column:", error);
      toast.error("Failed to create column");
      throw error;
    }
  };

  // Handle column reorder
  const handleColumnReorder = async (columnId: string, newOrder: number) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/task-statuses/${columnId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ order: newOrder }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reorder column");
      }

      // The UI is already updated optimistically, so we don't need to update state here
    } catch (error) {
      console.error("Error reordering column:", error);
      throw error;
    }
  };

  // Handle add task with specific status
  const handleAddTaskWithStatus = (statusKey: string) => {
    setActiveStatus(statusKey);
    setIsCreateDialogOpen(true);
  };

  // Handle background change
  const handleBackgroundChange = (newBackground: { type: string; value: string }) => {
    setBackground(newBackground);
    // Save to localStorage
    localStorage.setItem(
      `board-background-${projectId}`,
      JSON.stringify(newBackground)
    );
  };

  // Get background style based on type and value
  const getBackgroundStyle = () => {
    if (background.type === "color") {
      return { backgroundColor: background.value };
    } else if (background.type === "image") {
      return {
        backgroundImage: `url(${background.value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {};
  };

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-gray-800 relative overflow-hidden"
      style={getBackgroundStyle()}
    >
      {/* Board Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 border-b bg-white/90 dark:bg-gray-800/90 shadow-md backdrop-blur-sm">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{projectName}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => setIsBackgroundDialogOpen(true)}>
                <Palette className="h-4 w-4 mr-2" />
                Change Background
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center section - Search */}
        <div className="flex items-center gap-2 mx-auto">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search tasks... (press Enter)"
              className="pl-8 h-8 w-[200px] md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyFilter();
                }
              }}
            />
          </div>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <SortMenu
            onSort={applySorting}
            currentSortField={sortBy}
            currentSortDirection={sortDirection}
          />
          <ThemeToggle />
        </div>
      </div>

      {/* Board Content */}
      <TrelloBoardContent
        projectId={projectId}
        projectTasks={filteredTasks}
        taskStatuses={taskStatuses}
        canCreateTasks={true}
        canDragTasks={isOwner}
        canEditColumns={isOwner}
        canDragColumns={isOwner}
        onDragEnd={handleDragEnd}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        onColumnUpdate={handleColumnUpdate}
        onColumnDelete={handleColumnDelete}
        onColumnAdd={handleColumnAdd}
        onColumnReorder={handleColumnReorder}
        onAddTask={handleAddTaskWithStatus}
      />

      {/* Filter Status Indicator */}
      {searchQuery && filteredTasks.length !== projectTasks.length && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 flex items-center gap-2 z-50">
          <div className="text-sm">
            Showing {filteredTasks.length} of {projectTasks.length} tasks
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-2"
          >
            Show All
          </Button>
        </div>
      )}

      {/* Create Task Dialog */}
      <TaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
        taskStatuses={taskStatuses}
        onTaskCreate={handleTaskCreate}
        defaultStatus={activeStatus || undefined}
      />

      {/* Background Dialog */}
      <BackgroundDialog
        open={isBackgroundDialogOpen}
        onOpenChange={setIsBackgroundDialogOpen}
        currentBackground={background}
        onBackgroundChange={handleBackgroundChange}
      />
    </div>
  );
}
