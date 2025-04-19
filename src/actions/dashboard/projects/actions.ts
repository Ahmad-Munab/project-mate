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
    console.log(`Creating ${plan.columns.length} columns for project ${newProject.id}`);

    // Process columns one by one to ensure they're created properly
    for (let i = 0; i < plan.columns.length; i++) {
      const column = plan.columns[i];

      // Skip columns that already exist
      if (existingKeys.includes(column.key)) {
        console.log(`Column ${column.name} (${column.key}) already exists, skipping`);
        continue;
      }

      try {
        // Create the column
        const [newColumn] = await db.insert(projectTaskStatuses)
          .values({
            project_id: newProject.id,
            name: column.name,
            key: column.key,
            color: column.color || 'bg-gray-50 dark:bg-gray-900',
            is_default: column.key === 'BACKLOG', // Make BACKLOG the default column
            order: i, // Set the order based on the index in the columns array
          })
          .returning();

        console.log(`Created column: ${column.name} (${column.key}) with order ${i}`);
      } catch (columnError) {
        console.error(`Error creating column ${column.name} (${column.key}):`, columnError);

        // If it's a duplicate key error, try to fetch the existing column
        if (columnError.toString().includes('duplicate key value')) {
          console.log(`Column ${column.key} might already exist due to a race condition`);
        }
      }
    }

    // Fetch all columns after creation to ensure we have the latest data
    const createdColumns = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, newProject.id),
    });

    console.log(`Created ${createdColumns.length} columns for project ${newProject.id}:`,
      createdColumns.map(col => `${col.name} (${col.key})`).join(', '));

    // Get all valid column keys from the created columns
    const validColumnKeys = createdColumns.map(col => col.key);
    console.log(`Valid column keys: ${validColumnKeys.join(', ')}`);

    // Create tasks with the appropriate status keys
    console.log(`Creating ${plan.tasks.length} tasks for project ${newProject.id}`);

    // Process tasks one by one to ensure they're created properly
    const createdTasks = [];
    for (const task of plan.tasks) {
      try {
        // Ensure task status is a valid column key
        const taskStatus = validColumnKeys.includes(task.status) ? task.status : 'BACKLOG';

        // Map to enum values for backward compatibility
        const enumStatus =
          taskStatus === 'BACKLOG' ? 'BACKLOG' :
          taskStatus === 'TODO' ? 'TODO' :
          taskStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' :
          taskStatus === 'DONE' ? 'DONE' : 'BACKLOG';

        // Map priority to enum values
        const priority =
          task.priority === 'LOW' ? 'LOW' :
          task.priority === 'MEDIUM' ? 'MEDIUM' :
          task.priority === 'HIGH' ? 'HIGH' :
          task.priority === 'URGENT' ? 'URGENT' : 'MEDIUM';

        // Create the task
        const [newTask] = await db.insert(tasks)
          .values({
            title: task.title,
            description: task.description,
            status: enumStatus,
            status_key: taskStatus,
            priority: priority,
            project_id: newProject.id,
            created_by: user.id,
          })
          .returning();

        createdTasks.push(newTask);
        console.log(`Created task: ${task.title} in column ${taskStatus}`);
      } catch (taskError) {
        console.error(`Error creating task ${task.title}:`, taskError);
      }
    }

    console.log(`Created ${createdTasks.length} tasks for project ${newProject.id}`);

    // Log task distribution across columns
    const taskDistribution = {};
    validColumnKeys.forEach(key => taskDistribution[key] = 0);

    createdTasks.forEach(task => {
      const key = task.status_key || task.status;
      taskDistribution[key] = (taskDistribution[key] || 0) + 1;
    });

    console.log('Task distribution across columns:',
      Object.entries(taskDistribution)
        .map(([key, count]) => `${key}: ${count}`)
        .join(', '));

    // Store the project creation in the AI's memory with detailed information
    await storeEnhancedMessage(
      newProject.id,
      {
        role: "system",
        content: `Project created: ${plan.name}\n\nDescription: ${plan.description}\n\nColumns: ${createdColumns.map(col => col.name).join(', ')}\n\nTasks: ${createdTasks.length} tasks created with the following distribution:\n${Object.entries(taskDistribution).map(([key, count]) => `- ${key}: ${count} tasks`).join('\n')}\n\nThis project has been set up with multiple columns and tasks distributed across them. The AI has created technical tasks based on the project requirements.`,
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