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
    let projectTasks: Array<any> = [];
    try {
      projectTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.project_id, projectId));
    } catch (taskError) {
      console.error("Error fetching project tasks:", taskError);
    }

    // Get the project members
    let members: Array<any> = [];
    try {
      const memberResults = await db
        .select({
          user: users,
          role: projectMembers.role,
        })
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projectId))
        .innerJoin(users, eq(users.id, projectMembers.userId));

      members = memberResults.map(m => {
        const metadata = m.user?.metadata ?
          (typeof m.user.metadata === 'string' ? JSON.parse(m.user.metadata) : m.user.metadata) :
          {};

        return {
          id: m.user?.id,
          name: metadata?.full_name || metadata?.email?.split('@')[0] || 'Unknown User',
          email: metadata?.email || '',
          role: m.role,
        };
      });
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
 * @param techIcons - The tech icons for the task (optional)
 * @returns The created task
 */
export async function createTask(
  projectId: string,
  title: string,
  description: string,
  status: string = "BACKLOG",
  priority: string = "MEDIUM",
  techIcons?: string[]
) {
  try {
    if (!projectId) {
      console.error("Project ID is required");
      return null;
    }

    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      return null;
    }

    // Validate status and priority
    const validStatus = status === "BACKLOG" || status === "TODO" ||
                       status === "IN_PROGRESS" || status === "DONE" ?
                       status : "BACKLOG";

    const validPriority = priority === "LOW" || priority === "MEDIUM" ||
                         priority === "HIGH" || priority === "URGENT" ?
                         priority : "MEDIUM";

    // Import tech icon matcher if tech icons not provided
    let finalTechIcons = techIcons;
    if (!finalTechIcons || finalTechIcons.length === 0) {
      try {
        // Dynamically import to avoid circular dependencies
        const { suggestTechIcons } = await import("../tools/task/tech-icon-matcher");
        finalTechIcons = suggestTechIcons(title, description);
        console.log(`Auto-suggested tech icons for task "${title}":`, finalTechIcons);
      } catch (iconError) {
        console.error("Error suggesting tech icons:", iconError);
        finalTechIcons = [];
      }
    }

    // Create the task
    try {
      const [newTask] = await db
        .insert(tasks)
        .values({
          title: title || "Untitled Task",
          description: description || "",
          status: validStatus,
          status_key: validStatus,
          priority: validPriority,
          project_id: projectId,
          created_by: user.id,
          tech_icons: finalTechIcons && finalTechIcons.length > 0 ? JSON.stringify(finalTechIcons) : null,
          tech_icon: finalTechIcons && finalTechIcons.length > 0 ? finalTechIcons[0] : null,
        })
        .returning();

      return newTask;
    } catch (dbError) {
      console.error("Database error creating task:", dbError);
      return null;
    }
  } catch (error) {
    console.error("Failed to create task:", error);
    return null;
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
    techIcons?: string[];
  }
) {
  try {
    if (!taskId) {
      console.error("Task ID is required");
      return null;
    }

    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      return null;
    }

    // Get the task to check if it exists and get the project ID
    try {
      const taskResult = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      const task = taskResult && taskResult.length > 0 ? taskResult[0] : null;

      if (!task) {
        console.error("Task not found");
        return null;
      }

      // Validate status and priority if provided
      let validatedUpdates = { ...updates };

      if (updates.status) {
        validatedUpdates.status = (updates.status === "BACKLOG" || updates.status === "TODO" ||
                                updates.status === "IN_PROGRESS" || updates.status === "DONE") ?
                                updates.status as "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE" : undefined;
      }

      if (updates.priority) {
        validatedUpdates.priority = updates.priority === "LOW" || updates.priority === "MEDIUM" ||
                                  updates.priority === "HIGH" || updates.priority === "URGENT" ?
                                  updates.priority : task.priority;
      }

      // Handle tech icons
      let techIconsJson = null;
      let primaryTechIcon = null;

      if (updates.techIcons !== undefined) {
        // If tech icons are explicitly provided
        if (updates.techIcons && updates.techIcons.length > 0) {
          techIconsJson = JSON.stringify(updates.techIcons);
          primaryTechIcon = updates.techIcons[0];
        }
      } else if (updates.title || updates.description) {
        // If title or description is updated but no tech icons provided, auto-suggest
        try {
          const { suggestTechIcons } = await import("../tools/task/tech-icon-matcher");
          const title = updates.title || task.title;
          const description = updates.description || task.description;
          const suggestedIcons = suggestTechIcons(title, description);

          if (suggestedIcons.length > 0) {
            techIconsJson = JSON.stringify(suggestedIcons);
            primaryTechIcon = suggestedIcons[0];
            console.log(`Auto-suggested tech icons for updated task "${title}":`, suggestedIcons);
          }
        } catch (iconError) {
          console.error("Error suggesting tech icons for task update:", iconError);
        }
      }

      // Update the task
      const [updatedTask] = await db
        .update(tasks)
        .set({
          title: validatedUpdates.title,
          description: validatedUpdates.description,
          status: validatedUpdates.status as any,
          status_key: validatedUpdates.status || task.status_key,
          priority: validatedUpdates.priority as any,
          due_date: validatedUpdates.due_date,
          tech_icons: techIconsJson !== null ? techIconsJson : undefined,
          tech_icon: primaryTechIcon !== null ? primaryTechIcon : undefined,
        })
        .where(eq(tasks.id, taskId))
        .returning();

      return updatedTask;
    } catch (dbError) {
      console.error("Database error updating task:", dbError);
      return null;
    }
  } catch (error) {
    console.error("Failed to update task:", error);
    return null;
  }
}

/**
 * Delete a task
 * @param taskId - The ID of the task
 * @returns True if the task was deleted
 */
export async function deleteTask(taskId: string) {
  try {
    if (!taskId) {
      console.error("Task ID is required");
      return false;
    }

    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      return false;
    }

    // Check if the task exists
    try {
      const taskResult = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      const task = taskResult && taskResult.length > 0 ? taskResult[0] : null;

      if (!task) {
        console.error("Task not found");
        return false;
      }

      // Delete the task
      await db
        .delete(tasks)
        .where(eq(tasks.id, taskId));

      return true;
    } catch (dbError) {
      console.error("Database error deleting task:", dbError);
      return false;
    }
  } catch (error) {
    console.error("Failed to delete task:", error);
    return false;
  }
}

/**
 * Get all tasks for a project
 * @param projectId - The ID of the project
 * @returns The tasks
 */
export async function getProjectTasks(projectId: string) {
  try {
    if (!projectId) {
      console.error("Project ID is required");
      return [];
    }

    // Get all tasks for the project
    try {
      const projectTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.project_id, projectId));

      return projectTasks || [];
    } catch (dbError) {
      console.error("Database error getting project tasks:", dbError);
      return [];
    }
  } catch (error) {
    console.error("Failed to get project tasks:", error);
    return [];
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
    if (!projectId) {
      console.error("Project ID is required");
      return null;
    }

    if (!name) {
      console.error("Status name is required");
      return null;
    }

    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      return null;
    }

    try {
      // Get the highest order value
      const statuses = await getTaskStatuses(projectId);
      const maxOrder = statuses.length > 0
        ? Math.max(...statuses.map(s => s.order || 0))
        : -1;

      // Create the key from the name
      const key = name.toUpperCase().replace(/[^A-Z0-9]/g, "_");

      // Check if a status with this key already exists
      const existingStatuses = statuses.filter(s => s.key === key);
      if (existingStatuses.length > 0) {
        console.error(`Status with key ${key} already exists`);
        return null;
      }

      // Create the status
      const [newStatus] = await db
        .insert(projectTaskStatuses)
        .values({
          name,
          key,
          color: color || "gray",
          project_id: projectId,
          order: maxOrder + 1,
          is_default: false,
        })
        .returning();

      return newStatus;
    } catch (dbError) {
      console.error("Database error creating task status:", dbError);
      return null;
    }
  } catch (error) {
    console.error("Failed to create task status:", error);
    return null;
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
    if (!statusId || !projectId) {
      console.error("Status ID and Project ID are required");
      return null;
    }

    if (!updates || Object.keys(updates).length === 0) {
      console.error("No updates provided");
      return null;
    }

    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      return null;
    }

    try {
      // Get the status to check if it exists
      const statusResult = await db
        .select()
        .from(projectTaskStatuses)
        .where(
          and(
            eq(projectTaskStatuses.id, statusId),
            eq(projectTaskStatuses.project_id, projectId)
          )
        );

      const status = statusResult && statusResult.length > 0 ? statusResult[0] : null;

      if (!status) {
        console.error("Status not found");
        return null;
      }

      // Create the key from the name if name is provided
      const key = updates.name
        ? updates.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")
        : undefined;

      // Check if the new key would conflict with an existing key
      if (key) {
        const statuses = await getTaskStatuses(projectId);
        const existingStatuses = statuses.filter(s => s.key === key && s.id !== statusId);
        if (existingStatuses.length > 0) {
          console.error(`Status with key ${key} already exists`);
          return null;
        }
      }

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
    } catch (dbError) {
      console.error("Database error updating task status:", dbError);
      return null;
    }
  } catch (error) {
    console.error("Failed to update task status:", error);
    return null;
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
    if (!statusId || !projectId) {
      console.error("Status ID and Project ID are required");
      return false;
    }

    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      return false;
    }

    try {
      // Get the status to check if it exists
      const statusResult = await db
        .select()
        .from(projectTaskStatuses)
        .where(
          and(
            eq(projectTaskStatuses.id, statusId),
            eq(projectTaskStatuses.project_id, projectId)
          )
        );

      const status = statusResult && statusResult.length > 0 ? statusResult[0] : null;

      if (!status) {
        console.error("Status not found");
        return false;
      }

      // If the status is the default status, don't allow deletion
      if (status.is_default) {
        console.error("Cannot delete the default status");
        return false;
      }

      // If moveTasksTo is provided, move tasks to that status
      if (moveTasksTo) {
        // Get the target status to check if it exists
        const targetStatusResult = await db
          .select()
          .from(projectTaskStatuses)
          .where(
            and(
              eq(projectTaskStatuses.id, moveTasksTo),
              eq(projectTaskStatuses.project_id, projectId)
            )
          );

        const targetStatus = targetStatusResult && targetStatusResult.length > 0 ? targetStatusResult[0] : null;

        if (!targetStatus) {
          console.error("Target status not found");
          return false;
        }

        // Move tasks to the target status
        try {
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
        } catch (moveError) {
          console.error("Error moving tasks to target status:", moveError);
          return false;
        }
      }

      // Delete the status
      await db
        .delete(projectTaskStatuses)
        .where(eq(projectTaskStatuses.id, statusId));

      return true;
    } catch (dbError) {
      console.error("Database error deleting task status:", dbError);
      return false;
    }
  } catch (error) {
    console.error("Failed to delete task status:", error);
    return false;
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
    if (!taskId || !targetStatus || !projectId) {
      console.error("Task ID, Target Status, and Project ID are required");
      return null;
    }

    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      return null;
    }

    try {
      // Get the task to check if it exists
      const taskResult = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.project_id, projectId)
          )
        );

      const task = taskResult && taskResult.length > 0 ? taskResult[0] : null;

      if (!task) {
        console.error("Task not found");
        return null;
      }

      // Get the target status to check if it exists
      const statusResult = await db
        .select()
        .from(projectTaskStatuses)
        .where(
          and(
            eq(projectTaskStatuses.key, targetStatus),
            eq(projectTaskStatuses.project_id, projectId)
          )
        );

      const status = statusResult && statusResult.length > 0 ? statusResult[0] : null;

      if (!status) {
        console.error("Target status not found");
        return null;
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
    } catch (dbError) {
      console.error("Database error moving task:", dbError);
      return null;
    }
  } catch (error) {
    console.error("Failed to move task:", error);
    return null;
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
