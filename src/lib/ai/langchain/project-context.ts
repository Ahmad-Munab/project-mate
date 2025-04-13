/**
 * Project Context System
 * This file implements a comprehensive project context system
 * that provides the AI with full context of the project
 */

import { db } from "@/db";
import { projects, tasks, projectTaskStatuses, projectMembers, authUsers as users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { EnhancedVectorMemory, MemorySegmentType, createEnhancedMemory } from "./enhanced-vector-memory";

/**
 * Project context types
 */
export enum ProjectContextType {
  OVERVIEW = "OVERVIEW",
  TASKS = "TASKS",
  MEMBERS = "MEMBERS",
  STATUSES = "STATUSES",
  RECENT_ACTIVITY = "RECENT_ACTIVITY",
  CODE_STRUCTURE = "CODE_STRUCTURE",
  REPOSITORY = "REPOSITORY",
}

/**
 * Get comprehensive project information
 * @param projectId - The ID of the project
 * @returns Comprehensive project information
 */
export async function getComprehensiveProjectInfo(projectId: string) {
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

    // Get the task statuses
    const taskStatuses = await db
      .select()
      .from(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId))
      .orderBy(projectTaskStatuses.order);

    // Get the project members
    const members = await db
      .select({
        user: users,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .where(eq(projectMembers.project_id, projectId))
      .innerJoin(users, eq(users.id, projectMembers.user_id));

    // Get task counts by status
    const taskCountsByStatus = taskStatuses.map(status => {
      const count = projectTasks.filter(task => task.status_key === status.key).length;
      return {
        status: status.name,
        key: status.key,
        count,
      };
    });

    // Get task counts by priority
    const taskCountsByPriority = {
      LOW: projectTasks.filter(task => task.priority === "LOW").length,
      MEDIUM: projectTasks.filter(task => task.priority === "MEDIUM").length,
      HIGH: projectTasks.filter(task => task.priority === "HIGH").length,
      URGENT: projectTasks.filter(task => task.priority === "URGENT").length,
    };

    // Get recent tasks (last 10)
    const recentTasks = [...projectTasks]
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 10);

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      tasks: projectTasks,
      statuses: taskStatuses,
      members: members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
      stats: {
        total_tasks: projectTasks.length,
        total_members: members.length,
        tasks_by_status: taskCountsByStatus,
        tasks_by_priority: taskCountsByPriority,
      },
      recent_activity: {
        recent_tasks: recentTasks,
      },
    };
  } catch (error) {
    console.error("Failed to get comprehensive project info:", error);
    throw error;
  }
}

/**
 * Store project context in vector memory
 * @param projectId - The ID of the project
 * @returns True if the context was stored successfully
 */
export async function storeProjectContext(projectId: string): Promise<boolean> {
  try {
    // Create memory system
    const memory = await createEnhancedMemory(projectId);

    // Get comprehensive project info
    const projectInfo = await getComprehensiveProjectInfo(projectId);

    // Store project overview
    await memory.storeInVectorStore(
      `Project: ${projectInfo.project.name}
Description: ${projectInfo.project.description || "No description provided"}
Created: ${new Date(projectInfo.project.created_at).toLocaleDateString()}
Last Updated: ${new Date(projectInfo.project.updated_at || projectInfo.project.created_at).toLocaleDateString()}
Total Tasks: ${projectInfo.stats.total_tasks}
Total Members: ${projectInfo.stats.total_members}`,
      MemorySegmentType.PROJECT_INFO,
      {
        source: "project_overview",
        context_type: ProjectContextType.OVERVIEW,
      }
    );

    // Store task statuses
    await memory.storeInVectorStore(
      `Project Task Statuses:
${projectInfo.statuses.map(status => `- ${status.name} (${status.key}): ${projectInfo.stats.tasks_by_status.find(s => s.key === status.key)?.count || 0} tasks`).join('\n')}`,
      MemorySegmentType.PROJECT_INFO,
      {
        source: "task_statuses",
        context_type: ProjectContextType.STATUSES,
      }
    );

    // Store task information
    const taskChunks = [];
    for (let i = 0; i < projectInfo.tasks.length; i += 10) {
      const chunk = projectInfo.tasks.slice(i, i + 10);
      taskChunks.push(chunk);
    }

    for (let i = 0; i < taskChunks.length; i++) {
      const chunk = taskChunks[i];
      await memory.storeInVectorStore(
        `Project Tasks (Chunk ${i + 1}/${taskChunks.length}):
${chunk.map(task => `- ${task.title} (ID: ${task.id})
  Status: ${task.status}
  Priority: ${task.priority}
  Description: ${task.description || "No description provided"}
  Created: ${new Date(task.created_at).toLocaleDateString()}
  ${task.updated_at ? `Updated: ${new Date(task.updated_at).toLocaleDateString()}` : ""}`).join('\n\n')}`,
        MemorySegmentType.TASK_INFO,
        {
          source: `tasks_chunk_${i + 1}`,
          context_type: ProjectContextType.TASKS,
        }
      );
    }

    // Store member information
    await memory.storeInVectorStore(
      `Project Members:
${projectInfo.members.map(member => `- ${member.name} (${member.email})
  Role: ${member.role}`).join('\n\n')}`,
      MemorySegmentType.PROJECT_INFO,
      {
        source: "project_members",
        context_type: ProjectContextType.MEMBERS,
      }
    );

    // Store recent activity
    await memory.storeInVectorStore(
      `Recent Activity:
${projectInfo.recent_activity.recent_tasks.map(task => `- ${task.title} (ID: ${task.id})
  Status: ${task.status}
  Priority: ${task.priority}
  ${task.updated_at ? `Updated: ${new Date(task.updated_at).toLocaleDateString()}` : `Created: ${new Date(task.created_at).toLocaleDateString()}`}`).join('\n\n')}`,
      MemorySegmentType.PROJECT_INFO,
      {
        source: "recent_activity",
        context_type: ProjectContextType.RECENT_ACTIVITY,
      }
    );

    return true;
  } catch (error) {
    console.error("Failed to store project context:", error);
    return false;
  }
}

/**
 * Get comprehensive project context
 * @param projectId - The ID of the project
 * @param query - The query to search for
 * @returns Comprehensive project context
 */
export async function getComprehensiveProjectContext(
  projectId: string,
  query: string = ""
): Promise<string> {
  try {
    // Create memory system
    const memory = await createEnhancedMemory(projectId);

    // Get context with more documents
    const context = await memory.getContext(
      query,
      [
        MemorySegmentType.PROJECT_INFO,
        MemorySegmentType.TASK_INFO,
        MemorySegmentType.CONVERSATION,
        MemorySegmentType.DECISION_HISTORY,
      ],
      30 // Increase the number of documents
    );

    // If we don't have much context, try to store project context first
    if (context.length < 200) {
      await storeProjectContext(projectId);
      
      // Try again with the newly stored context
      return await memory.getContext(
        query,
        [
          MemorySegmentType.PROJECT_INFO,
          MemorySegmentType.TASK_INFO,
          MemorySegmentType.CONVERSATION,
          MemorySegmentType.DECISION_HISTORY,
        ],
        30
      );
    }

    return context;
  } catch (error) {
    console.error("Failed to get comprehensive project context:", error);
    
    // Try to get basic project info as a fallback
    try {
      const projectInfo = await getComprehensiveProjectInfo(projectId);
      return `Project: ${projectInfo.project.name}
Description: ${projectInfo.project.description || "No description provided"}
Total Tasks: ${projectInfo.stats.total_tasks}
Total Members: ${projectInfo.stats.total_members}`;
    } catch (fallbackError) {
      console.error("Failed to get fallback project info:", fallbackError);
      return "";
    }
  }
}

/**
 * Initialize project context
 * @param projectId - The ID of the project
 * @returns True if the context was initialized successfully
 */
export async function initializeProjectContext(projectId: string): Promise<boolean> {
  try {
    // Store project context
    await storeProjectContext(projectId);
    
    return true;
  } catch (error) {
    console.error("Failed to initialize project context:", error);
    return false;
  }
}
