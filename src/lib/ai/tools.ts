import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks, projects, projectMembers, taskStatusEnum, priorityLevelEnum, projectTaskStatuses } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { storeEnhancedMessage } from "./enhanced-memory";
import { AIMessage } from "./memory";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// Tool to create a new task
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

// Tool to get project information
export async function getProjectInfo(projectId: string) {
  try {
    // Get the project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      throw new Error("Project not found");
    }

    // Get project members
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    // Get project tasks
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId));

    return {
      project,
      members,
      tasks: projectTasks,
    };
  } catch (error) {
    console.error("Failed to get project info:", error);
    throw error;
  }
}

// Tool to update project description
export async function updateProjectDescription(
  projectId: string,
  description: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if user is project owner or manager
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER")) {
      throw new Error("Not authorized to update project description");
    }

    // Update the project
    const [updatedProject] = await db
      .update(projects)
      .set({
        description,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    return updatedProject;
  } catch (error) {
    console.error("Failed to update project description:", error);
    throw error;
  }
}

// Tool to get task statuses
export async function getTaskStatuses(projectId: string) {
  try {
    // Get task statuses directly from the database
    const statuses = await db
      .select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(asc(projectTaskStatuses.order));

    return statuses;
  } catch (error) {
    console.error("Failed to get task statuses:", error);
    return [];
  }
}

// Tool to update a task
export async function updateTask(
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    status?: string;
    status_key?: string;
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

    // Prepare update data
    const updateData: any = {};

    // Update fields if provided
    if (updates.title) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.priority) {
      // Validate priority
      const validPriority = Object.values(priorityLevelEnum.enumValues).includes(updates.priority as any);
      updateData.priority = validPriority ? updates.priority : "MEDIUM";
    }
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;

    // Handle status update
    if (updates.status) {
      // Check if the status is a valid enum value
      const validEnum = Object.values(taskStatusEnum.enumValues).includes(updates.status as any);

      // Set status based on validity
      updateData.status = validEnum ? updates.status : "BACKLOG";

      // If status_key is explicitly provided, use it, otherwise use status
      updateData.status_key = updates.status_key || updates.status;
    }

    // Update the task
    const [updatedTask] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      throw new Error("Task not found");
    }

    return updatedTask;
  } catch (error) {
    console.error("Failed to update task:", error);
    throw error;
  }
}

// Tool to delete a task
export async function deleteTask(taskId: string) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Delete the task
    await db.delete(tasks).where(eq(tasks.id, taskId));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}

// Tool to create a new task status column
export async function createTaskStatus(
  projectId: string,
  name: string,
  color: string = "bg-gray-50 dark:bg-gray-900"
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Generate a key from the name
    const key = name.toUpperCase().replace(/\s+/g, '_');

    // Get the highest order value
    const statuses = await getTaskStatuses(projectId);
    const maxOrder = statuses.length > 0
      ? Math.max(...statuses.map(s => s.order || 0))
      : 0;

    // Create the task status
    const [newStatus] = await db.insert(projectTaskStatuses)
      .values({
        project_id: projectId,
        name,
        key,
        color,
        is_default: false,
        order: maxOrder + 1,
      })
      .returning();

    return newStatus;
  } catch (error) {
    console.error("Failed to create task status:", error);
    throw error;
  }
}

// Tool to update a task status column
export async function updateTaskStatus(
  statusId: string,
  updates: {
    name?: string;
    color?: string;
    order?: number;
  }
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date(),
    };

    // Update fields if provided
    if (updates.name) {
      updateData.name = updates.name.trim();
      // Update key if name is changed
      updateData.key = updates.name.toUpperCase().replace(/\s+/g, '_');
    }
    if (updates.color) updateData.color = updates.color;
    if (updates.order !== undefined) updateData.order = updates.order;

    // Update the task status
    const [updatedStatus] = await db.update(projectTaskStatuses)
      .set(updateData)
      .where(eq(projectTaskStatuses.id, statusId))
      .returning();

    if (!updatedStatus) {
      throw new Error("Task status not found");
    }

    return updatedStatus;
  } catch (error) {
    console.error("Failed to update task status:", error);
    throw error;
  }
}

// Tool to delete a task status column
export async function deleteTaskStatus(statusId: string) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the status to check if it's default
    const [status] = await db.select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.id, statusId));

    if (!status) {
      throw new Error("Task status not found");
    }

    if (status.is_default) {
      throw new Error("Cannot delete default task status");
    }

    // Delete the task status
    await db.delete(projectTaskStatuses)
      .where(eq(projectTaskStatuses.id, statusId));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete task status:", error);
    throw error;
  }
}

// Tool to get all tasks for a project
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

// Tool to move a task to a different status
export async function moveTask(taskId: string, newStatus: string) {
  try {
    // Update the task status
    const updatedTask = await updateTask(taskId, {
      status: newStatus,
      status_key: newStatus,
    });

    return updatedTask;
  } catch (error) {
    console.error("Failed to move task:", error);
    throw error;
  }
}
