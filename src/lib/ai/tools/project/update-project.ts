/**
 * Update Project Tool
 * This tool allows the AI to update project details
 */

import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Update a project's details
 * @param projectId - The ID of the project
 * @param updates - The updates to apply
 * @returns The updated project
 */
export async function updateProject(
  projectId: string,
  updates: {
    name?: string;
    description?: string;
    readme?: string;
  }
) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.readme !== undefined) updateData.readme = updates.readme;

    // Update the project
    const [updatedProject] = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    if (!updatedProject) {
      throw new Error("Project not found");
    }

    return {
      success: true,
      message: "Project updated successfully",
      project: updatedProject
    };
  } catch (error) {
    console.error("Error updating project:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to update project"
    };
  }
}

/**
 * Create a tool for updating projects
 * @param projectId - The ID of the project
 * @returns The update project tool
 */
export function updateProjectTool(projectId: string) {
  return {
    name: "update_project",
    description: "Update a project's details such as name, description, or readme.",
    func: async (params: {
      name?: string;
      description?: string;
      readme?: string;
    }) => {
      try {
        const result = await updateProject(projectId, params);
        return JSON.stringify(result);
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  };
}
