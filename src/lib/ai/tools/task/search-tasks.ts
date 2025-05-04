/**
 * Search Tasks Tool
 * This tool allows the AI to search for tasks based on various criteria
 */

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, like, or, inArray } from "drizzle-orm";

/**
 * Search for tasks in a project
 * @param projectId - The ID of the project
 * @param query - Search parameters
 * @returns The matching tasks
 */
export async function searchTasks(
  projectId: string,
  query: {
    searchText?: string;
    status?: string | string[];
    priority?: string | string[];
    limit?: number;
  }
) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // Start with the base query
    let dbQuery = db.select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId));

    // Add search text filter if provided
    if (query.searchText) {
      const searchPattern = `%${query.searchText}%`;
      dbQuery = dbQuery.where(
        or(
          like(tasks.title, searchPattern),
          like(tasks.description || '', searchPattern)
        )
      );
    }

    // Add status filter if provided
    if (query.status) {
      if (Array.isArray(query.status)) {
        dbQuery = dbQuery.where(inArray(tasks.status_key, query.status));
      } else {
        dbQuery = dbQuery.where(eq(tasks.status_key, query.status));
      }
    }

    // Add priority filter if provided
    if (query.priority) {
      if (Array.isArray(query.priority)) {
        dbQuery = dbQuery.where(inArray(tasks.priority, query.priority));
      } else {
        dbQuery = dbQuery.where(eq(tasks.priority, query.priority));
      }
    }

    // Add limit if provided
    if (query.limit && query.limit > 0) {
      dbQuery = dbQuery.limit(query.limit);
    }

    // Execute the query
    const results = await dbQuery;

    return {
      success: true,
      message: `Found ${results.length} matching tasks`,
      tasks: results
    };
  } catch (error) {
    console.error("Error searching tasks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to search tasks"
    };
  }
}

/**
 * Create a tool for searching tasks
 * @param projectId - The ID of the project
 * @returns The search tasks tool
 */
export function searchTasksTool(projectId: string) {
  return {
    name: "search_tasks",
    description: "Search for tasks in a project based on text, status, priority, or other criteria.",
    func: async (params: {
      searchText?: string;
      status?: string | string[];
      priority?: string | string[];
      limit?: number;
    }) => {
      try {
        const result = await searchTasks(projectId, params);
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
