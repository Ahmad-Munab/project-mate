/**
 * Project Operations Tools
 * This file contains functions for project operations
 */

import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Get project members
 * @param projectId - The ID of the project
 * @returns Project members
 */
export async function getProjectMembers(projectId: string) {
  try {
    // Get the project members
    const members = await db
      .select({
        id: projectMembers.userId,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    return members;
  } catch (error) {
    console.error("Failed to get project members:", error);
    throw error;
  }
}

/**
 * Get project members tool
 * @param projectId - The ID of the project
 * @returns A tool for getting project members
 */
export function getProjectMembersTool(projectId: string) {
  return {
    name: "get_project_members",
    description: "Get the members of the project. Use this when you need to know who is working on the project.",
    schema: z.object({}),
    func: async () => {
      try {
        const members = await getProjectMembers(projectId);
        return members;
      } catch (error) {
        console.error("Failed to get project members:", error);
        return { error: "Failed to get project members" };
      }
    },
  };
}

/**
 * Update project
 * @param projectId - The ID of the project
 * @param name - The name of the project
 * @param description - The description of the project
 * @returns The updated project
 */
export async function updateProject(
  projectId: string,
  name?: string,
  description?: string
) {
  try {
    // Update the project
    const [project] = await db
      .update(projects)
      .set({
        name,
        description,
      })
      .where(eq(projects.id, projectId))
      .returning();

    return project;
  } catch (error) {
    console.error("Failed to update project:", error);
    throw error;
  }
}

/**
 * Update project tool
 * @param projectId - The ID of the project
 * @returns A tool for updating a project
 */
export function updateProjectTool(projectId: string) {
  return {
    name: "update_project",
    description: "Update the project details. Use this when the user wants to modify the project name or description.",
    schema: z.object({
      name: z.string().optional().describe("The new name of the project"),
      description: z.string().optional().describe("The new description of the project"),
    }),
    func: async ({ name, description }: { name?: string; description?: string }) => {
      try {
        // Update the project
        const project = await updateProject(projectId, name, description);
        
        return project;
      } catch (error) {
        console.error("Failed to update project:", error);
        return { error: "Failed to update project" };
      }
    },
  };
}

/**
 * Add project member
 * @param projectId - The ID of the project
 * @param userId - The ID of the user
 * @param role - The role of the user
 * @returns The added project member
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: string
) {
  try {
    // Add the project member
    const [member] = await db
      .insert(projectMembers)
      .values({
        projectId,
        userId,
        role,
      })
      .returning();

    return member;
  } catch (error) {
    console.error("Failed to add project member:", error);
    throw error;
  }
}

/**
 * Add project member tool
 * @param projectId - The ID of the project
 * @returns A tool for adding a project member
 */
export function addProjectMemberTool(projectId: string) {
  return {
    name: "add_project_member",
    description: "Add a new member to the project. Use this when the user wants to add someone to the project.",
    schema: z.object({
      userId: z.string().describe("The ID of the user to add"),
      role: z.string().describe("The role of the user (e.g., 'OWNER', 'MEMBER')"),
    }),
    func: async ({ userId, role }: { userId: string; role: string }) => {
      try {
        // Add the project member
        const member = await addProjectMember(projectId, userId, role);
        
        return member;
      } catch (error) {
        console.error("Failed to add project member:", error);
        return { error: "Failed to add project member" };
      }
    },
  };
}

/**
 * Remove project member
 * @param projectId - The ID of the project
 * @param userId - The ID of the user
 * @returns The removed project member
 */
export async function removeProjectMember(
  projectId: string,
  userId: string
) {
  try {
    // Remove the project member
    const [member] = await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      )
      .returning();

    return member;
  } catch (error) {
    console.error("Failed to remove project member:", error);
    throw error;
  }
}

/**
 * Remove project member tool
 * @param projectId - The ID of the project
 * @returns A tool for removing a project member
 */
export function removeProjectMemberTool(projectId: string) {
  return {
    name: "remove_project_member",
    description: "Remove a member from the project. Use this when the user wants to remove someone from the project.",
    schema: z.object({
      userId: z.string().describe("The ID of the user to remove"),
    }),
    func: async ({ userId }: { userId: string }) => {
      try {
        // Remove the project member
        const member = await removeProjectMember(projectId, userId);
        
        return member;
      } catch (error) {
        console.error("Failed to remove project member:", error);
        return { error: "Failed to remove project member" };
      }
    },
  };
}

import { and } from "drizzle-orm";
