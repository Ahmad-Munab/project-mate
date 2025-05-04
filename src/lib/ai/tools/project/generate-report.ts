/**
 * Generate Project Report Tool
 * This tool allows the AI to generate reports about project status and progress
 */

import { db } from "@/db";
import { tasks, projectTaskStatuses, projects } from "@/db/schema";
import { eq, and, count, isNotNull } from "drizzle-orm";

/**
 * Generate a report for a project
 * @param projectId - The ID of the project
 * @returns A report with project statistics and status
 */
export async function generateProjectReport(projectId: string) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // Get project details
    const [projectDetails] = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!projectDetails) {
      throw new Error("Project not found");
    }

    // Get all columns
    const columns = await db.select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(projectTaskStatuses.order);

    // Get task counts by status
    const tasksByStatus = [];
    let totalTasks = 0;

    for (const column of columns) {
      const [result] = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.project_id, projectId),
            eq(tasks.status_key, column.key)
          )
        );

      const taskCount = result?.count || 0;
      totalTasks += taskCount;

      tasksByStatus.push({
        status: column.name,
        key: column.key,
        count: taskCount
      });
    }

    // Get task counts by priority
    const [priorityCounts] = await db
      .select({
        low: count(eq(tasks.priority, "LOW")),
        medium: count(eq(tasks.priority, "MEDIUM")),
        high: count(eq(tasks.priority, "HIGH")),
        urgent: count(eq(tasks.priority, "URGENT"))
      })
      .from(tasks)
      .where(eq(tasks.project_id, projectId));

    // Calculate completion percentage
    const completedTasks = tasksByStatus.find(s => s.key === "DONE")?.count || 0;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get tasks with due dates
    const tasksWithDueDates = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.project_id, projectId),
          // Filter for non-null due dates
          isNotNull(tasks.due_date)
        )
      );

    // Calculate overdue tasks
    const now = new Date();
    const overdueTasks = tasksWithDueDates.filter(task => {
      const dueDate = new Date(task.due_date!);
      return dueDate < now && task.status_key !== "DONE";
    });

    // Generate the report
    return {
      success: true,
      report: {
        projectName: projectDetails.name,
        projectDescription: projectDetails.description,
        createdAt: projectDetails.created_at,
        updatedAt: projectDetails.updated_at,
        totalTasks,
        completionPercentage,
        tasksByStatus,
        priorityCounts,
        dueDateStats: {
          tasksWithDueDates: tasksWithDueDates.length,
          overdueTasks: overdueTasks.length
        }
      },
      message: "Project report generated successfully"
    };
  } catch (error) {
    console.error("Error generating project report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to generate project report"
    };
  }
}

/**
 * Create a tool for generating project reports
 * @param projectId - The ID of the project
 * @returns The generate project report tool
 */
export function generateProjectReportTool(projectId: string) {
  return {
    name: "generate_project_report",
    description: "Generate a comprehensive report about the project's status, progress, and statistics.",
    func: async () => {
      try {
        const result = await generateProjectReport(projectId);
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
