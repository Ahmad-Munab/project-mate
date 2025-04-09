import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks, taskStatusEnum, priorityLevelEnum } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { storeEnhancedMessage } from "../enhanced-memory";

/**
 * Creates a new task in the project
 * @param projectId - The ID of the project
 * @param title - The title of the task
 * @param description - The description of the task
 * @param status - The status of the task (default: BACKLOG)
 * @param priority - The priority of the task (default: MEDIUM)
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

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Task created: ${title} (${status}, ${priority})`,
        timestamp: new Date(),
      },
      newTask.id
    );

    return newTask;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw error;
  }
}

/**
 * Updates an existing task
 * @param taskId - The ID of the task to update
 * @param projectId - The ID of the project
 * @param updates - The updates to apply to the task
 * @returns The updated task
 */
export async function updateTask(
  taskId: string,
  projectId: string,
  updates: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: Date | null;
    assigned_to?: string | null;
  }
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Validate status if provided
    if (updates.status) {
      const validStatus = Object.values(taskStatusEnum.enumValues).includes(updates.status as any);
      if (!validStatus) {
        delete updates.status;
      } else {
        updates.status_key = updates.status;
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
        updated_at: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.project_id, projectId)))
      .returning();

    if (!updatedTask) {
      throw new Error("Task not found or not part of the project");
    }

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Task updated: ${updatedTask.title}`,
        timestamp: new Date(),
      },
      taskId
    );

    return updatedTask;
  } catch (error) {
    console.error("Failed to update task:", error);
    throw error;
  }
}

/**
 * Deletes a task
 * @param taskId - The ID of the task to delete
 * @param projectId - The ID of the project
 * @returns True if the task was deleted successfully
 */
export async function deleteTask(taskId: string, projectId: string) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the task first to log it
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.project_id, projectId)));

    if (!task) {
      throw new Error("Task not found or not part of the project");
    }

    // Delete the task
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.project_id, projectId)));

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Task deleted: ${task.title}`,
        timestamp: new Date(),
      }
    );

    return true;
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}

/**
 * Sets a due date for a task
 * @param taskId - The ID of the task
 * @param projectId - The ID of the project
 * @param dueDate - The due date to set
 * @returns The updated task
 */
export async function setTaskDueDate(
  taskId: string,
  projectId: string,
  dueDate: Date | null
) {
  try {
    return await updateTask(taskId, projectId, { due_date: dueDate });
  } catch (error) {
    console.error("Failed to set task due date:", error);
    throw error;
  }
}

/**
 * Assigns a task to a user
 * @param taskId - The ID of the task
 * @param projectId - The ID of the project
 * @param userId - The ID of the user to assign the task to
 * @returns The updated task
 */
export async function assignTask(
  taskId: string,
  projectId: string,
  userId: string | null
) {
  try {
    return await updateTask(taskId, projectId, { assigned_to: userId });
  } catch (error) {
    console.error("Failed to assign task:", error);
    throw error;
  }
}

/**
 * Changes the status of a task
 * @param taskId - The ID of the task
 * @param projectId - The ID of the project
 * @param status - The new status
 * @returns The updated task
 */
export async function changeTaskStatus(
  taskId: string,
  projectId: string,
  status: string
) {
  try {
    return await updateTask(taskId, projectId, { status });
  } catch (error) {
    console.error("Failed to change task status:", error);
    throw error;
  }
}

/**
 * Changes the priority of a task
 * @param taskId - The ID of the task
 * @param projectId - The ID of the project
 * @param priority - The new priority
 * @returns The updated task
 */
export async function changeTaskPriority(
  taskId: string,
  projectId: string,
  priority: string
) {
  try {
    return await updateTask(taskId, projectId, { priority });
  } catch (error) {
    console.error("Failed to change task priority:", error);
    throw error;
  }
}

/**
 * Gets all tasks for a project
 * @param projectId - The ID of the project
 * @returns An array of tasks
 */
export async function getProjectTasks(projectId: string) {
  try {
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
 * Gets tasks by status
 * @param projectId - The ID of the project
 * @param status - The status to filter by
 * @returns An array of tasks with the specified status
 */
export async function getTasksByStatus(projectId: string, status: string) {
  try {
    const filteredTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.project_id, projectId), eq(tasks.status, status as any)));

    return filteredTasks;
  } catch (error) {
    console.error("Failed to get tasks by status:", error);
    throw error;
  }
}

/**
 * Gets tasks by priority
 * @param projectId - The ID of the project
 * @param priority - The priority to filter by
 * @returns An array of tasks with the specified priority
 */
export async function getTasksByPriority(projectId: string, priority: string) {
  try {
    const filteredTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.project_id, projectId), eq(tasks.priority, priority as any)));

    return filteredTasks;
  } catch (error) {
    console.error("Failed to get tasks by priority:", error);
    throw error;
  }
}
