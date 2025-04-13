'use server'

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projects, projectMembers, tasks, projectTaskStatuses } from "@/db/schema";
import { generateProjectPlan } from "@/lib/ai/tools/project-creator";
import { storeEnhancedMessage } from "@/lib/ai/memory/enhanced";
import { eq } from "drizzle-orm";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const idea = formData.get('idea') as string;

  if (!idea) {
    return { error: 'Project idea is required' };
  }

  try {
    const plan = await generateProjectPlan(idea);

    if (!plan.name || !plan.description || !Array.isArray(plan.tasks) || !Array.isArray(plan.columns)) {
      console.error('Invalid plan structure:', plan);
      return { error: 'Invalid AI response structure' };
    }

    const [newProject] = await db.insert(projects)
      .values({
        name: plan.name,
        description: plan.description,
        ownerId: user.id,
      })
      .returning();

    if (!newProject?.id) {
      return { error: 'Failed to create project record' };
    }

    await db.insert(projectMembers)
      .values({
        projectId: newProject.id,
        userId: user.id,
        role: 'OWNER',
      });

    // Check if any task statuses already exist for this project
    const existingStatuses = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, newProject.id),
    });

    // Get existing status keys
    const existingKeys = existingStatuses.map(status => status.key);

    // Create task statuses/columns that don't already exist
    const columnPromises = plan.columns
      .filter((column: { key: string, name: string, color: string }) => !existingKeys.includes(column.key)) // Skip columns that already exist
      .map((column: { key: string, name: string, color: string }, index: number) =>
        db.insert(projectTaskStatuses)
          .values({
            project_id: newProject.id,
            name: column.name,
            key: column.key,
            color: column.color || '#E5E7EB',
            is_default: column.key === 'BACKLOG', // Make BACKLOG the default column
            order: existingStatuses.length + index, // Set the order based on existing statuses + index
          })
      );

    if (columnPromises.length > 0) {
      await Promise.all(columnPromises);
    }

    // Create tasks with the appropriate status keys
    const taskPromises = plan.tasks.map((task: { title: string, description: string, status: string, priority: string }) =>
      db.insert(tasks)
        .values({
          title: task.title,
          description: task.description,
          status: task.status === 'BACKLOG' ? 'BACKLOG' :
                 task.status === 'TODO' ? 'TODO' :
                 task.status === 'IN_PROGRESS' ? 'IN_PROGRESS' :
                 task.status === 'DONE' ? 'DONE' : 'BACKLOG', // Map to enum values for backward compatibility
          status_key: task.status, // Store the custom status key
          priority: task.priority === 'LOW' ? 'LOW' :
                 task.priority === 'MEDIUM' ? 'MEDIUM' :
                 task.priority === 'HIGH' ? 'HIGH' :
                 task.priority === 'URGENT' ? 'URGENT' : 'MEDIUM', // Map to enum values
          project_id: newProject.id,
          created_by: user.id,
        })
    );

    await Promise.all(taskPromises);

    // Store the project creation in the AI's memory
    await storeEnhancedMessage(
      newProject.id,
      {
        role: "system",
        content: `Project created: ${plan.name}\n\nDescription: ${plan.description}\n\nColumns: ${plan.columns.map(col => col.name).join(', ')}\n\nTasks: ${plan.tasks.length} tasks created across different columns`,
        timestamp: new Date(),
      }
    );

    return { success: true, projectId: newProject.id };
  } catch (error) {
    console.error('Detailed error in project creation:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}