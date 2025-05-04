import { useState, useEffect } from "react";
import { Task, TaskStatus } from "../types";
import { fetchProjectTasks, fetchProjectTaskStatuses } from "../utils/api";
import { getDefaultTaskStatuses, sortTasks } from "../utils/helpers";
import { toast } from "sonner";

interface UseBoardDataProps {
  projectId?: string;
  initialTasks: Task[];
}

interface UseBoardDataReturn {
  projectTasks: Task[];
  setProjectTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskStatuses: TaskStatus[];
  setTaskStatuses: React.Dispatch<React.SetStateAction<TaskStatus[]>>;
  isLoading: boolean;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  sortDirection: "asc" | "desc";
  setSortDirection: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  applySorting: (sortField?: string, direction?: "asc" | "desc") => void;
  refreshTaskStatuses: () => Promise<void>;
  handleTaskUpdate: (updatedTask: Task) => void;
  handleTaskCreate: (newTask: Task) => void;
  handleTaskDelete: (taskId: string) => void;
  originalTasks: Task[];
}

export function useBoardData({ projectId, initialTasks }: UseBoardDataProps): UseBoardDataReturn {
  const [projectTasks, setProjectTasks] = useState<Task[]>(initialTasks);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Store original unsorted tasks
  const [originalTasks, setOriginalTasks] = useState<Task[]>(initialTasks);

  // Sorting state (not applied automatically)
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Function to apply sorting once (not automatically)
  const applySorting = (sortField?: string, direction?: "asc" | "desc") => {
    console.log("useBoardData: applySorting called with", sortField, direction);

    // Use provided values or current state
    const field = sortField || sortBy;
    const dir = direction || sortDirection;

    // Update sort criteria state
    setSortBy(field);
    setSortDirection(dir);

    // Create a deep copy of the tasks to avoid reference issues
    const tasksCopy = [...projectTasks];

    // Apply sorting once
    const sortedTasks = sortTasks(tasksCopy, field, dir);

    console.log(`Sorted ${sortedTasks.length} tasks by ${field} (${dir})`);

    // Update project tasks with the sorted tasks
    setProjectTasks(sortedTasks);

    // Also update original tasks to maintain consistency
    setOriginalTasks([...sortedTasks]);

    // Show toast notification
    toast.success(`Sorted by ${field} (${dir === "asc" ? "ascending" : "descending"})`);

    // Return the sorted tasks (useful for chaining)
    return sortedTasks;
  };

  // Load data when projectId changes
  useEffect(() => {
    if (projectId) {
      setIsLoading(true);

      const loadData = async () => {
        try {
          // Start both fetches in parallel
          const taskPromise = initialTasks.length > 0
            ? Promise.resolve(initialTasks)
            : fetchProjectTasks(projectId);

          const statusPromise = fetchProjectTaskStatuses(projectId);

          // Wait for both to complete
          const [tasks, statuses] = await Promise.allSettled([
            taskPromise,
            statusPromise
          ]);

          // Handle tasks result
          if (tasks.status === 'fulfilled') {
            // Store both original and displayed tasks without sorting
            const loadedTasks = [...tasks.value];
            setOriginalTasks(loadedTasks);
            setProjectTasks(loadedTasks);

            // Log to confirm no sorting is happening
            console.log("Loaded tasks without sorting:", loadedTasks);
          } else {
            console.error("Error fetching tasks:", tasks.reason);
            // Don't show error toast if we already have initial tasks
            if (initialTasks.length === 0) {
              toast.error("Failed to load tasks");
            }
          }

          // Handle statuses result
          if (statuses.status === 'fulfilled') {
            console.log('Successfully fetched task statuses:', statuses.value);
            setTaskStatuses(statuses.value);
          } else {
            console.error("Error fetching task statuses:", statuses.reason);
            toast.error("Failed to load task statuses");

            // Set default statuses as fallback
            const defaultStatuses = getDefaultTaskStatuses(projectId);
            setTaskStatuses(defaultStatuses);
          }
        } catch (error) {
          console.error("Error loading board data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }
  }, [projectId, initialTasks]);

  // Refresh task statuses
  const refreshTaskStatuses = async () => {
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

  // Handle task update
  const handleTaskUpdate = (updatedTask: Task) => {
    // Update both original and displayed tasks without changing order
    setOriginalTasks((prev) => {
      return prev.map((task) => (task.id === updatedTask.id ? updatedTask : task));
    });

    setProjectTasks((prev) => {
      return prev.map((task) => (task.id === updatedTask.id ? updatedTask : task));
    });
  };

  // Handle task creation
  const handleTaskCreate = (newTask: Task) => {
    // Update both original and displayed tasks without changing order
    setOriginalTasks((prev) => {
      const newTasks = [...prev];
      newTasks.push(newTask);
      return newTasks;
    });

    setProjectTasks((prev) => {
      const newTasks = [...prev];
      newTasks.push(newTask);
      return newTasks;
    });
  };

  // Handle task deletion
  const handleTaskDelete = (taskId: string) => {
    // Update both original and displayed tasks without changing order
    setOriginalTasks((prev) => {
      return prev.filter((task) => task.id !== taskId);
    });

    setProjectTasks((prev) => {
      return prev.filter((task) => task.id !== taskId);
    });
  };

  return {
    projectTasks,
    setProjectTasks,
    taskStatuses,
    setTaskStatuses,
    isLoading,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    applySorting,
    refreshTaskStatuses,
    handleTaskUpdate,
    handleTaskCreate,
    handleTaskDelete,
    originalTasks,
  };
}
