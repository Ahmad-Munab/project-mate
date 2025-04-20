/**
 * Project Info Tool
 * This file contains functions for getting project information
 */

import { db } from "@/db";
import { tasks, projectTaskStatuses, projects, projectMembers, authUsers as users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get project information
 * @param projectId - The ID of the project
 * @returns Project information
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

    // Get the project task statuses
    const taskStatuses = await db
      .select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId));

    // Get the project members
    const members = await db
      .select({
        id: projectMembers.userId,
        role: projectMembers.role,
        user: users,
      })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
      .innerJoin(users, eq(projectMembers.userId, users.id));

    // Return the project information
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      tasks: projectTasks,
      taskStatuses,
      members,
    };
  } catch (error) {
    console.error("Failed to get project info:", error);
    throw error;
  }
}

/**
 * Get project info tool
 * @param projectId - The ID of the project
 * @returns A tool for getting project information
 */
export function getProjectInfoTool(projectId: string) {
  return {
    name: "get_project_info",
    description: "Get information about the current project. Use this when you need to know about the project structure, tasks, or members.",
    schema: z.object({
      detailed: z.boolean().optional().describe("Whether to include detailed information about tasks and members"),
    }),
    func: async ({ detailed }: { detailed?: boolean }) => {
      try {
        const projectInfo = await getProjectInfo(projectId);
        
        if (!detailed) {
          // Return a simplified version
          return {
            name: projectInfo.name,
            description: projectInfo.description,
            taskCount: projectInfo.tasks.length,
            memberCount: projectInfo.members.length,
            taskStatusCount: projectInfo.taskStatuses.length,
          };
        }
        
        return projectInfo;
      } catch (error) {
        console.error("Failed to get project info:", error);
        return { error: "Failed to get project information" };
      }
    },
  };
}

import { z } from "zod";
