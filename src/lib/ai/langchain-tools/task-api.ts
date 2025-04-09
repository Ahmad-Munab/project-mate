/**
 * Task API functions for LangChain tools
 * This file contains the API functions that are used by the LangChain tools
 */

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks, taskStatusEnum, priorityLevelEnum } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Create a new task
 * @param projectId - The ID of the project
 * @param title - The title of the task
 * @param description - The description of the task
 * @param status - The status of the task
 * @param priority - The priority of the task
 * @returns The created task
 */
export async function createTask(
  projectId: string,
  title: string,
  description: string,
  status: string = "BACKLOG",
  priority: string = "MEDIUM"
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Validate status
    const validStatus = Object.values(taskStatusEnum.enumValues).includes(status as any);
    if (!validStatus) {
      status = "BACKLOG";
    }

    // Validate priority
    const validPriority = Object.values(priorityLevelEnum.enumValues).includes(priority as any);
    if (!validPriority) {
      priority = "MEDIUM";
    }

    // Create the task
    const [newTask] = await db
      .insert(tasks)
      .values({
        title,
        description,
        status: status as any,
        status_key: status,
        priority: priority as any,
        project_id: projectId,
        created_by: user.id,
      })
      .returning();

    return newTask;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw error;
  }
}

/**
 * Update a task
 * @param taskId - The ID of the task
 * @param updates - The updates to apply
 * @returns The updated task
 */
export async function updateTask(
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: Date | null;
  }
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the task to check if it exists and get the project ID
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      throw new Error("Task not found");
    }

    // Validate status if provided
    if (updates.status) {
      const validStatus = Object.values(taskStatusEnum.enumValues).includes(updates.status as any);
      if (!validStatus) {
        delete updates.status;
      }
    }

    // Validate priority if provided
    if (updates.priority) {
      const validPriority = Object.values(priorityLevelEnum.enumValues).includes(updates.priority as any);
      if (!validPriority) {
        delete updates.priority;
      }
    }

    // Update the task
    const [updatedTask] = await db
      .update(tasks)
      .set({
        ...updates,
        status_key: updates.status || task.status_key,
      })
      .where(eq(tasks.id, taskId))
      .returning();

    return updatedTask;
  } catch (error) {
    console.error("Failed to update task:", error);
    throw error;
  }
}

/**
 * Delete a task
 * @param taskId - The ID of the task
 * @returns True if the task was deleted
 */
export async function deleteTask(taskId: string) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Delete the task
    await db
      .delete(tasks)
      .where(eq(tasks.id, taskId));

    return true;
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}

/**
 * Get all tasks for a project
 * @param projectId - The ID of the project
 * @returns The tasks
 */
export async function getProjectTasks(projectId: string) {
  try {
    // Get all tasks for the project
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId));

    return projectTasks;
  } catch (error) {
    console.error("Failed to get project tasks:", error);
    throw error;
  }
}

/**
 * Get tasks by status
 * @param projectId - The ID of the project
 * @param status - The status to filter by
 * @returns The tasks
 */
export async function getTasksByStatus(projectId: string, status: string) {
  try {
    // Get tasks by status
    const tasksByStatus = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.project_id, projectId),
          eq(tasks.status_key, status)
        )
      );

    return tasksByStatus;
  } catch (error) {
    console.error("Failed to get tasks by status:", error);
    throw error;
  }
}

/**
 * Get tasks by priority
 * @param projectId - The ID of the project
 * @param priority - The priority to filter by
 * @returns The tasks
 */
export async function getTasksByPriority(projectId: string, priority: string) {
  try {
    // Get tasks by priority
    const tasksByPriority = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.project_id, projectId),
          eq(tasks.priority, priority as any)
        )
      );

    return tasksByPriority;
  } catch (error) {
    console.error("Failed to get tasks by priority:", error);
    throw error;
  }
}

/**
 * Set a task's due date
 * @param taskId - The ID of the task
 * @param dueDate - The due date
 * @returns The updated task
 */
export async function setTaskDueDate(taskId: string, dueDate: Date | null) {
  try {
    // Update the task
    const updatedTask = await updateTask(taskId, {
      due_date: dueDate,
    });

    return updatedTask;
  } catch (error) {
    console.error("Failed to set task due date:", error);
    throw error;
  }
}

/**
 * Change a task's status
 * @param taskId - The ID of the task
 * @param status - The new status
 * @returns The updated task
 */
export async function changeTaskStatus(taskId: string, status: string) {
  try {
    // Update the task
    const updatedTask = await updateTask(taskId, {
      status,
    });

    return updatedTask;
  } catch (error) {
    console.error("Failed to change task status:", error);
    throw error;
  }
}

/**
 * Change a task's priority
 * @param taskId - The ID of the task
 * @param priority - The new priority
 * @returns The updated task
 */
export async function changeTaskPriority(taskId: string, priority: string) {
  try {
    // Update the task
    const updatedTask = await updateTask(taskId, {
      priority,
    });

    return updatedTask;
  } catch (error) {
    console.error("Failed to change task priority:", error);
    throw error;
  }
}
