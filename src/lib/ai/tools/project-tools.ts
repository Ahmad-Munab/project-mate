import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projects, projectMembers, tasks, projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { storeEnhancedMessage } from "../enhanced-memory";

/**
 * Gets information about a project
 * @param projectId - The ID of the project
 * @returns Project information including tasks, members, and statuses
 */
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

    // Get the project tasks
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId));

    // Get the project members
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    // Get the project task statuses
    const statuses = await db
      .select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId));

    return {
      project,
      tasks: projectTasks,
      members,
      statuses,
    };
  } catch (error) {
    console.error("Failed to get project info:", error);
    throw error;
  }
}

/**
 * Updates the project description
 * @param projectId - The ID of the project
 * @param description - The new description
 * @returns The updated project
 */
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

    // Update the project
    const [updatedProject] = await db
      .update(projects)
      .set({
        description,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    if (!updatedProject) {
      throw new Error("Project not found");
    }

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Project description updated`,
        timestamp: new Date(),
      }
    );

    return updatedProject;
  } catch (error) {
    console.error("Failed to update project description:", error);
    throw error;
  }
}

/**
 * Updates the project README
 * @param projectId - The ID of the project
 * @param readme - The new README content
 * @returns The updated project
 */
export async function updateProjectReadme(
  projectId: string,
  readme: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Update the project
    const [updatedProject] = await db
      .update(projects)
      .set({
        readme,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    if (!updatedProject) {
      throw new Error("Project not found");
    }

    // Log the action
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Project README updated`,
        timestamp: new Date(),
      }
    );

    return updatedProject;
  } catch (error) {
    console.error("Failed to update project README:", error);
    throw error;
  }
}

/**
 * Gets project statistics
 * @param projectId - The ID of the project
 * @returns Project statistics
 */
export async function getProjectStats(projectId: string) {
  try {
    // Get project info
    const projectInfo = await getProjectInfo(projectId);
    
    // Calculate statistics
    const totalTasks = projectInfo.tasks.length;
    const completedTasks = projectInfo.tasks.filter(task => task.status === "DONE").length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Count tasks by status
    const tasksByStatus = {};
    projectInfo.statuses.forEach(status => {
      tasksByStatus[status.name] = projectInfo.tasks.filter(task => task.status === status.key).length;
    });
    
    // Count tasks by priority
    const tasksByPriority = {
      LOW: projectInfo.tasks.filter(task => task.priority === "LOW").length,
      MEDIUM: projectInfo.tasks.filter(task => task.priority === "MEDIUM").length,
      HIGH: projectInfo.tasks.filter(task => task.priority === "HIGH").length,
      URGENT: projectInfo.tasks.filter(task => task.priority === "URGENT").length,
    };
    
    return {
      totalTasks,
      completedTasks,
      completionRate,
      tasksByStatus,
      tasksByPriority,
      totalMembers: projectInfo.members.length,
    };
  } catch (error) {
    console.error("Failed to get project stats:", error);
    throw error;
  }
}

/**
 * Gets tasks due soon
 * @param projectId - The ID of the project
 * @param days - Number of days to look ahead (default: 7)
 * @returns Tasks due within the specified number of days
 */
export async function getTasksDueSoon(projectId: string, days: number = 7) {
  try {
    // Calculate the date range
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    
    // Get tasks due within the date range
    const dueTasks = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.project_id, projectId),
        // @ts-ignore - Drizzle ORM typing issue
        tasks.due_date.gte(now),
        // @ts-ignore - Drizzle ORM typing issue
        tasks.due_date.lte(future)
      ));
    
    return dueTasks;
  } catch (error) {
    console.error("Failed to get tasks due soon:", error);
    throw error;
  }
}

/**
 * Gets overdue tasks
 * @param projectId - The ID of the project
 * @returns Overdue tasks
 */
export async function getOverdueTasks(projectId: string) {
  try {
    // Calculate the current date
    const now = new Date();
    
    // Get tasks that are overdue
    const overdueTasks = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.project_id, projectId),
        // @ts-ignore - Drizzle ORM typing issue
        tasks.due_date.lt(now),
        // Not completed
        tasks.status.notEquals("DONE")
      ));
    
    return overdueTasks;
  } catch (error) {
    console.error("Failed to get overdue tasks:", error);
    throw error;
  }
}
