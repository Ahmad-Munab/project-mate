import { Task, TaskStatus } from "../types";
import { getDefaultTaskStatuses } from "./helpers";

/**
 * Fetch tasks for a project
 * @param projectId Project ID
 * @returns Array of tasks
 */
export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
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
 * Fetch task statuses for a project with improved error handling
 * @param projectId Project ID
 * @returns Array of task statuses
 */
export async function fetchProjectTaskStatuses(projectId: string): Promise<TaskStatus[]> {
  try {
    if (!projectId) {
      return getDefaultTaskStatuses('default');
    }

    // First check if we already have statuses
    let statuses = [];

    try {
      // Fetch existing statuses
      const response = await fetch(`/api/projects/${projectId}/task-statuses`);

      if (response.ok) {
        statuses = await response.json();

        // If we have statuses, return them immediately
        if (statuses && statuses.length > 0) {
          return statuses;
        }
      }
    } catch (fetchError) {
      // Error fetching task statuses, will try to initialize
    }

    // If we get here, we need to initialize statuses

    // Try to initialize statuses
    try {
      const initResponse = await fetch(`/api/projects/${projectId}/task-statuses/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (initResponse.ok) {
        const newStatuses = await initResponse.json();

        // If we got statuses back, return them
        if (newStatuses && newStatuses.length > 0) {
          return newStatuses;
        }
      }
    } catch (initError) {
      console.error('Error initializing statuses:', initError);
    }

    // If initialization failed, try one more time with a direct fetch
    try {
      const retryResponse = await fetch(`/api/projects/${projectId}/task-statuses`);

      if (retryResponse.ok) {
        const retryStatuses = await retryResponse.json();

        if (retryStatuses && retryStatuses.length > 0) {
          return retryStatuses;
        }
      }
    } catch (retryError) {
      // Retry fetch failed
    }

    // If we get here, all attempts failed
    return getDefaultTaskStatuses(projectId);
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
export async function updateTaskStatus(taskId: string, newStatus: string): Promise<Task> {
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

/**
 * Create an invite link for a project
 * @param projectId Project ID
 * @param role Role for the invite
 * @returns Invite URL
 */
export async function createProjectInviteLink(projectId: string, role: "MEMBER" | "MANAGER"): Promise<string> {
  const response = await fetch(`/api/projects/${projectId}/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    throw new Error("Failed to create invite link");
  }

  const { inviteUrl } = await response.json();
  return inviteUrl;
}
