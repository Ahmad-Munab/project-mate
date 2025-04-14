/**
 * Search Tools
 * This file contains functions for searching tasks and projects
 */

import { db } from "@/db";
import { tasks, projects } from "@/db/schema";
import { eq, like, and } from "drizzle-orm";
import { z } from "zod";

/**
 * Search tasks
 * @param projectId - The ID of the project
 * @param query - The search query
 * @returns Matching tasks
 */
export async function searchTasks(projectId: string, query: string) {
  try {
    // Search for tasks
    const matchingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.project_id, projectId),
          like(tasks.title, `%${query}%`)
        )
      );

    return matchingTasks;
  } catch (error) {
    console.error("Failed to search tasks:", error);
    throw error;
  }
}

/**
 * Search tasks tool
 * @param projectId - The ID of the project
 * @returns A tool for searching tasks
 */
export function searchTasksTool(projectId: string) {
  return {
    name: "search_tasks",
    description: "Search for tasks in the project. Use this when the user is looking for specific tasks.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
    func: async ({ query }: { query: string }) => {
      try {
        const matchingTasks = await searchTasks(projectId, query);
        return matchingTasks;
      } catch (error) {
        console.error("Failed to search tasks:", error);
        return { error: "Failed to search tasks" };
      }
    },
  };
}

/**
 * Search tasks by description
 * @param projectId - The ID of the project
 * @param query - The search query
 * @returns Matching tasks
 */
export async function searchTasksByDescription(projectId: string, query: string) {
  try {
    // Search for tasks
    const matchingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.project_id, projectId),
          like(tasks.description, `%${query}%`)
        )
      );

    return matchingTasks;
  } catch (error) {
    console.error("Failed to search tasks by description:", error);
    throw error;
  }
}

/**
 * Search tasks by description tool
 * @param projectId - The ID of the project
 * @returns A tool for searching tasks by description
 */
export function searchTasksByDescriptionTool(projectId: string) {
  return {
    name: "search_tasks_by_description",
    description: "Search for tasks in the project by description. Use this when the user is looking for tasks with specific content in the description.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
    func: async ({ query }: { query: string }) => {
      try {
        const matchingTasks = await searchTasksByDescription(projectId, query);
        return matchingTasks;
      } catch (error) {
        console.error("Failed to search tasks by description:", error);
        return { error: "Failed to search tasks by description" };
      }
    },
  };
}
