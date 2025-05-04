/**
 * Assign Task Tool
 * This tool allows the AI to assign tasks to project members
 */

import { db } from "@/db";
import { taskAssignees, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Assign a task to a project member
 * @param taskId - The ID of the task
 * @param userId - The ID of the user to assign
 * @param projectId - The ID of the project (for validation)
 * @returns Result of the assignment operation
 */
export async function assignTask(taskId: string, userId: string, projectId: string) {
  try {
    if (!taskId || !userId || !projectId) {
      throw new Error("Task ID, User ID, and Project ID are required");
    }

    // Verify the user is a member of the project
    const memberCheck = await db.select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.userId, userId),
          eq(projectMembers.projectId, projectId)
        )
      )
      .limit(1);

    if (memberCheck.length === 0) {
      throw new Error("User is not a member of this project");
    }

    // Check if assignment already exists
    const existingAssignment = await db.select()
      .from(taskAssignees)
      .where(
        and(
          eq(taskAssignees.taskId, taskId),
          eq(taskAssignees.userId, userId)
        )
      )
      .limit(1);

    if (existingAssignment.length > 0) {
      return {
        success: true,
        message: "Task is already assigned to this user",
        assignment: existingAssignment[0]
      };
    }

    // Create the assignment
    const [assignment] = await db.insert(taskAssignees)
      .values({
        taskId,
        userId
      })
      .returning();

    return {
      success: true,
      message: "Task assigned successfully",
      assignment
    };
  } catch (error) {
    console.error("Error assigning task:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to assign task"
    };
  }
}

/**
 * Create a tool for assigning tasks
 * @param projectId - The ID of the project
 * @returns The assign task tool
 */
export function assignTaskTool(projectId: string) {
  return {
    name: "assign_task",
    description: "Assign a task to a project member. Requires the task ID and user ID.",
    func: async (params: { taskId: string; userId: string }) => {
      try {
        const result = await assignTask(params.taskId, params.userId, projectId);
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
