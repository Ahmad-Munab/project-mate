import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectTaskStatuses, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { storeEnhancedMessage } from "../enhanced-memory";

/**
 * Creates a new task status (column) in the project
 * @param projectId - The ID of the project
 * @param name - The name of the status
 * @param color - The color of the status (default: "gray")
 * @param position - The position of the status (default: 0)
 * @returns The created status
 */
export async function createTaskStatus(
  projectId: string,
  name: string,
  color: string = "gray",
  position: number = 0
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the highest order if not provided
    if (position === 0) {
      const statuses = await db
        .select()
        .from(projectTaskStatuses)
        .where(eq(projectTaskStatuses.project_id, projectId));

      position = statuses.length > 0
        ? Math.max(...statuses.map(s => s.order)) + 1
        : 1;
    }

    // Create a key from the name
    const key = name.toUpperCase().replace(/\s+/g, "_");

    // Create the status
    const [newStatus] = await db
      .insert(projectTaskStatuses)
      .values({
        name,
        key,
        color,
        order: position,
        project_id: projectId,
      })
      .returning();

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Column created: ${name} (position: ${position})`,
        timestamp: new Date(),
      }
    );

    return newStatus;
  } catch (error) {
    console.error("Failed to create task status:", error);
    throw error;
  }
}

/**
 * Updates an existing task status (column)
 * @param statusId - The ID of the status to update
 * @param projectId - The ID of the project
 * @param updates - The updates to apply to the status
 * @returns The updated status
 */
export async function updateTaskStatus(
  statusId: string,
  projectId: string,
  updates: {
    name?: string;
    color?: string;
    position?: number;
  }
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // If name is updated, update the key as well
    let updatedValues: any = { ...updates };
    if (updates.name) {
      updatedValues.key = updates.name.toUpperCase().replace(/\s+/g, "_");
    }

    // Convert position to order if provided
    if (updates.position !== undefined) {
      updatedValues.order = updates.position;
      delete updatedValues.position;
    }

    // Update the status
    const [updatedStatus] = await db
      .update(projectTaskStatuses)
      .set({
        ...updatedValues,
        updated_at: new Date(),
      })
      .where(and(
        eq(projectTaskStatuses.id, statusId),
        eq(projectTaskStatuses.project_id, projectId)
      ))
      .returning();

    if (!updatedStatus) {
      throw new Error("Status not found or not part of the project");
    }

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Column updated: ${updatedStatus.name}`,
        timestamp: new Date(),
      }
    );

    return updatedStatus;
  } catch (error) {
    console.error("Failed to update task status:", error);
    throw error;
  }
}

/**
 * Deletes a task status (column)
 * @param statusId - The ID of the status to delete
 * @param projectId - The ID of the project
 * @param moveTasksTo - The ID of the status to move tasks to (optional)
 * @returns True if the status was deleted successfully
 */
export async function deleteTaskStatus(
  statusId: string,
  projectId: string,
  moveTasksTo?: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the status first to log it
    const [status] = await db
      .select()
      .from(projectTaskStatuses)
      .where(and(
        eq(projectTaskStatuses.id, statusId),
        eq(projectTaskStatuses.project_id, projectId)
      ));

    if (!status) {
      throw new Error("Status not found or not part of the project");
    }

    // If moveTasksTo is provided, move tasks to that status
    if (moveTasksTo) {
      // Verify the target status exists
      const [targetStatus] = await db
        .select()
        .from(projectTaskStatuses)
        .where(and(
          eq(projectTaskStatuses.id, moveTasksTo),
          eq(projectTaskStatuses.project_id, projectId)
        ));

      if (!targetStatus) {
        throw new Error("Target status not found or not part of the project");
      }

      // Move tasks to the target status
      await db
        .update(tasks)
        .set({
          status: targetStatus.key as any,
          status_key: targetStatus.key,
        })
        .where(and(
          eq(tasks.project_id, projectId),
          eq(tasks.status, status.key as any)
        ));
    }

    // Delete the status
    await db
      .delete(projectTaskStatuses)
      .where(and(
        eq(projectTaskStatuses.id, statusId),
        eq(projectTaskStatuses.project_id, projectId)
      ));

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Column deleted: ${status.name}${moveTasksTo ? ` (tasks moved to ${moveTasksTo})` : ""}`,
        timestamp: new Date(),
      }
    );

    return true;
  } catch (error) {
    console.error("Failed to delete task status:", error);
    throw error;
  }
}

/**
 * Gets all task statuses (columns) for a project
 * @param projectId - The ID of the project
 * @returns An array of task statuses
 */
export async function getTaskStatuses(projectId: string) {
  try {
    const statuses = await db
      .select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(projectTaskStatuses.order);

    return statuses;
  } catch (error) {
    console.error("Failed to get task statuses:", error);
    throw error;
  }
}

/**
 * Moves a task to a different status (column)
 * @param taskId - The ID of the task to move
 * @param statusId - The ID of the status to move the task to
 * @returns The updated task
 */
export async function moveTask(
  taskId: string,
  statusId: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the task first to get the project ID
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      throw new Error("Task not found");
    }

    const projectId = task.project_id;

    // Get the status
    const [status] = await db
      .select()
      .from(projectTaskStatuses)
      .where(and(
        eq(projectTaskStatuses.id, statusId),
        eq(projectTaskStatuses.project_id, projectId)
      ));

    if (!status) {
      throw new Error("Status not found or not part of the project");
    }

    // Update the task
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: status.key as any,
        status_key: status.key,
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
        content: `Task moved: ${updatedTask.title} to ${status.name}`,
        timestamp: new Date(),
      },
      taskId
    );

    return updatedTask;
  } catch (error) {
    console.error("Failed to move task:", error);
    throw error;
  }
}

/**
 * Reorders task statuses (columns)
 * @param projectId - The ID of the project
 * @param statusIds - An array of status IDs in the desired order
 * @returns An array of updated statuses
 */
export async function reorderTaskStatuses(
  projectId: string,
  statusIds: string[]
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Update each status with its new position
    const updatedStatuses = [];
    for (let i = 0; i < statusIds.length; i++) {
      const [updatedStatus] = await db
        .update(projectTaskStatuses)
        .set({
          order: i + 1,
          updated_at: new Date(),
        })
        .where(and(
          eq(projectTaskStatuses.id, statusIds[i]),
          eq(projectTaskStatuses.project_id, projectId)
        ))
        .returning();

      if (updatedStatus) {
        updatedStatuses.push(updatedStatus);
      }
    }

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Columns reordered`,
        timestamp: new Date(),
      }
    );

    return updatedStatuses;
  } catch (error) {
    console.error("Failed to reorder task statuses:", error);
    throw error;
  }
}
