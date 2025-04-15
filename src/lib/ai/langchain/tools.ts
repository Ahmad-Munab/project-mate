/**
 * LangChain Tools System
 * This file implements proper LangChain tools
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db";
import { tasks, projectTaskStatuses, projects, projectMembers, authUsers as users, taskStatusEnum } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

/**
 * Get project information
 * @param projectId - The ID of the project
 * @returns Project information
 */
export async function getProjectInfo(projectId: string) {
  try {
    if (!projectId) {
      console.error("Project ID is required");
      return {
        project: { name: "Unknown Project", description: "No project information available" },
        tasks: [],
        members: [],
      };
    }

    // Get the project
    const projectResult = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    const project = projectResult && projectResult.length > 0 ? projectResult[0] : null;

    if (!project) {
      console.warn(`Project not found with ID: ${projectId}`);
      return {
        project: { name: "Unknown Project", description: "Project not found" },
        tasks: [],
        members: [],
      };
    }

    // Get the project tasks
    let projectTasks = [];
    try {
      projectTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.project_id, projectId));
    } catch (taskError) {
      console.error("Error fetching project tasks:", taskError);
    }

    // Get the project members
    let members = [];
    try {
      const memberResults = await db
        .select({
          user: users,
          role: projectMembers.role,
        })
        .from(projectMembers)
        .where(eq(projectMembers.project_id, projectId))
        .innerJoin(users, eq(users.id, projectMembers.user_id));

      members = memberResults.map(m => ({
        id: m.user?.id,
        name: m.user?.name,
        email: m.user?.email,
        role: m.role,
      }));
    } catch (memberError) {
      console.error("Error fetching project members:", memberError);
    }

    return {
      project,
      tasks: projectTasks,
      members,
    };
  } catch (error) {
    console.error("Failed to get project info:", error);
    // Return a default object instead of throwing
    return {
      project: { name: "Unknown Project", description: "Error retrieving project information" },
      tasks: [],
      members: [],
    };
  }
}

/**
 * Get task statuses for a project
 * @param projectId - The ID of the project
 * @returns The task statuses
 */
export async function getTaskStatuses(projectId: string) {
  try {
    if (!projectId) {
      console.error("Project ID is required");
      return [];
    }

    // Get the task statuses
    const statuses = await db
      .select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(projectTaskStatuses.order);

    return statuses || [];
  } catch (error) {
    console.error("Failed to get task statuses:", error);
    // Return an empty array instead of throwing
    return [];
  }
}

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
 * Create a new task status (column)
 * @param projectId - The ID of the project
 * @param name - The name of the status
 * @param color - The color of the status
 * @returns The created status
 */
export async function createTaskStatus(
  projectId: string,
  name: string,
  color?: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the highest order value
    const statuses = await getTaskStatuses(projectId);
    const maxOrder = statuses.length > 0
      ? Math.max(...statuses.map(s => s.order))
      : -1;

    // Create the key from the name
    const key = name.toUpperCase().replace(/[^A-Z0-9]/g, "_");

    // Create the status
    const [newStatus] = await db
      .insert(projectTaskStatuses)
      .values({
        name,
        key,
        color: color || "bg-gray-50",
        project_id: projectId,
        order: maxOrder + 1,
        is_default: false,
      })
      .returning();

    return newStatus;
  } catch (error) {
    console.error("Failed to create task status:", error);
    throw error;
  }
}

/**
 * Update a task status (column)
 * @param statusId - The ID of the status to update
 * @param projectId - The ID of the project
 * @param updates - The updates to apply
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

    // Get the status to check if it exists
    const [status] = await db
      .select()
      .from(projectTaskStatuses)
      .where(
        and(
          eq(projectTaskStatuses.id, statusId),
          eq(projectTaskStatuses.project_id, projectId)
        )
      );

    if (!status) {
      throw new Error("Status not found");
    }

    // Create the key from the name if name is provided
    const key = updates.name
      ? updates.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")
      : undefined;

    // Update the status
    const [updatedStatus] = await db
      .update(projectTaskStatuses)
      .set({
        name: updates.name,
        key,
        color: updates.color,
        order: updates.position,
      })
      .where(eq(projectTaskStatuses.id, statusId))
      .returning();

    return updatedStatus;
  } catch (error) {
    console.error("Failed to update task status:", error);
    throw error;
  }
}

/**
 * Delete a task status (column)
 * @param statusId - The ID of the status to delete
 * @param projectId - The ID of the project
 * @param moveTasksTo - The ID of the status to move tasks to
 * @returns True if the status was deleted
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

    // Get the status to check if it exists
    const [status] = await db
      .select()
      .from(projectTaskStatuses)
      .where(
        and(
          eq(projectTaskStatuses.id, statusId),
          eq(projectTaskStatuses.project_id, projectId)
        )
      );

    if (!status) {
      throw new Error("Status not found");
    }

    // If the status is the default status, don't allow deletion
    if (status.is_default) {
      throw new Error("Cannot delete the default status");
    }

    // If moveTasksTo is provided, move tasks to that status
    if (moveTasksTo) {
      // Get the target status to check if it exists
      const [targetStatus] = await db
        .select()
        .from(projectTaskStatuses)
        .where(
          and(
            eq(projectTaskStatuses.id, moveTasksTo),
            eq(projectTaskStatuses.project_id, projectId)
          )
        );

      if (!targetStatus) {
        throw new Error("Target status not found");
      }

      // Move tasks to the target status
      await db
        .update(tasks)
        .set({
          status: targetStatus.key as any,
          status_key: targetStatus.key,
        })
        .where(
          and(
            eq(tasks.project_id, projectId),
            eq(tasks.status_key, status.key)
          )
        );
    }

    // Delete the status
    await db
      .delete(projectTaskStatuses)
      .where(eq(projectTaskStatuses.id, statusId));

    return true;
  } catch (error) {
    console.error("Failed to delete task status:", error);
    throw error;
  }
}

/**
 * Move a task to a different status
 * @param taskId - The ID of the task to move
 * @param targetStatus - The key of the status to move the task to
 * @param projectId - The ID of the project
 * @returns The updated task
 */
export async function moveTask(
  taskId: string,
  targetStatus: string,
  projectId: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the task to check if it exists
    const [task] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.project_id, projectId)
        )
      );

    if (!task) {
      throw new Error("Task not found");
    }

    // Get the target status to check if it exists
    const [status] = await db
      .select()
      .from(projectTaskStatuses)
      .where(
        and(
          eq(projectTaskStatuses.key, targetStatus),
          eq(projectTaskStatuses.project_id, projectId)
        )
      );

    if (!status) {
      throw new Error("Target status not found");
    }

    // Update the task
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: targetStatus as any,
        status_key: targetStatus,
      })
      .where(eq(tasks.id, taskId))
      .returning();

    return updatedTask;
  } catch (error) {
    console.error("Failed to move task:", error);
    throw error;
  }
}

/**
 * Create a task tool
 * @param projectId - The ID of the project
 * @returns A LangChain tool for creating tasks
 */
export function createTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "create_task",
    description: "Create a new task in the project",
    schema: z.object({
      title: z.string().describe("The title of the task"),
      description: z.string().describe("The description of the task"),
      status: z.string().optional().describe("The status of the task (e.g., 'BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE')"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("The priority of the task"),
    }),
    func: async ({ title, description, status = "BACKLOG", priority = "MEDIUM" }) => {
      try {
        const task = await createTask(projectId, title, description, status, priority);
        return JSON.stringify({ success: true, task });
      } catch (error) {
        console.error("Error in create_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

/**
 * Update task tool
 * @param projectId - The ID of the project
 * @returns A LangChain tool for updating tasks
 */
export function updateTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "update_task",
    description: "Update an existing task in the project",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to update"),
      title: z.string().optional().describe("The new title of the task"),
      description: z.string().optional().describe("The new description of the task"),
      status: z.string().optional().describe("The new status of the task"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("The new priority of the task"),
    }),
    func: async ({ taskId, title, description, status, priority }) => {
      try {
        const task = await updateTask(taskId, {
          title,
          description,
          status,
          priority,
        });
        return JSON.stringify({ success: true, task });
      } catch (error) {
        console.error("Error in update_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

/**
 * Delete task tool
 * @param projectId - The ID of the project
 * @returns A LangChain tool for deleting tasks
 */
export function deleteTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "delete_task",
    description: "Delete a task from the project",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to delete"),
    }),
    func: async ({ taskId }) => {
      try {
        await deleteTask(taskId);
        return JSON.stringify({ success: true });
      } catch (error) {
        console.error("Error in delete_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

/**
 * Create column tool
 * @param projectId - The ID of the project
 * @returns A LangChain tool for creating columns
 */
export function createColumnTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "create_column",
    description: "Create a new column (task status) in the project",
    schema: z.object({
      name: z.string().describe("The name of the column"),
      color: z.string().optional().describe("The color of the column (e.g., 'blue', 'green', 'red', etc.)"),
    }),
    func: async ({ name, color }) => {
      try {
        const status = await createTaskStatus(projectId, name, color);
        return JSON.stringify({ success: true, status });
      } catch (error) {
        console.error("Error in create_column tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

/**
 * Update column tool
 * @param projectId - The ID of the project
 * @returns A LangChain tool for updating columns
 */
export function updateColumnTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "update_column",
    description: "Update an existing column (task status) in the project",
    schema: z.object({
      statusId: z.string().describe("The ID of the column to update"),
      name: z.string().optional().describe("The new name of the column"),
      color: z.string().optional().describe("The new color of the column"),
      position: z.number().optional().describe("The new position of the column"),
    }),
    func: async ({ statusId, name, color, position }) => {
      try {
        const status = await updateTaskStatus(statusId, projectId, {
          name,
          color,
          position,
        });
        return JSON.stringify({ success: true, status });
      } catch (error) {
        console.error("Error in update_column tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

/**
 * Delete column tool
 * @param projectId - The ID of the project
 * @returns A LangChain tool for deleting columns
 */
export function deleteColumnTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "delete_column",
    description: "Delete a column (task status) from the project",
    schema: z.object({
      statusId: z.string().describe("The ID of the column to delete"),
      moveTasksTo: z.string().optional().describe("The ID of the column to move tasks to"),
    }),
    func: async ({ statusId, moveTasksTo }) => {
      try {
        await deleteTaskStatus(statusId, projectId, moveTasksTo);
        return JSON.stringify({ success: true });
      } catch (error) {
        console.error("Error in delete_column tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

/**
 * Move task tool
 * @param projectId - The ID of the project
 * @returns A LangChain tool for moving tasks
 */
export function moveTaskTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "move_task",
    description: "Move a task to a different column",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to move"),
      targetStatus: z.string().describe("The key of the column to move the task to"),
    }),
    func: async ({ taskId, targetStatus }) => {
      try {
        const task = await moveTask(taskId, targetStatus, projectId);
        return JSON.stringify({ success: true, task });
      } catch (error) {
        console.error("Error in move_task tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

/**
 * Get project info tool
 * @param projectId - The ID of the project
 * @returns A LangChain tool for getting project info
 */
export function getProjectInfoTool(projectId: string) {
  return new DynamicStructuredTool({
    name: "get_project_info",
    description: "Get information about the project",
    schema: z.object({}),
    func: async () => {
      try {
        const projectInfo = await getProjectInfo(projectId);
        return JSON.stringify({ success: true, projectInfo });
      } catch (error) {
        console.error("Error in get_project_info tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

/**
 * Get all tools for a project
 * @param projectId - The ID of the project
 * @returns An array of LangChain tools
 */
export function getProjectTools(projectId: string) {
  return [
    createTaskTool(projectId),
    updateTaskTool(projectId),
    deleteTaskTool(projectId),
    createColumnTool(projectId),
    updateColumnTool(projectId),
    deleteColumnTool(projectId),
    moveTaskTool(projectId),
    getProjectInfoTool(projectId),
  ];
}
