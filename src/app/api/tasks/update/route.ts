import { NextResponse } from 'next/server';
import { db } from "@/db";
import { tasks, projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateAuth, isValidStatusEnum } from "@/utils/task-status";

/**
 * PATCH: Update a task's properties (status, title, description, priority, due_date, etc.)
 */
export async function PATCH(request: Request) {
  try {
    // Validate authentication
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    // Parse and validate request body
    const body = await request.json();
    const { taskId, status, status_key, title, description, priority, due_date, tech_icon, tech_icons } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // First, get the task to check if it exists and get its project_id
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Prepare the update data
    const updateData: any = {};

    // Handle status update
    if (status) {
      // Check if the status is a valid format
      const validStatus = isValidStatusEnum(status);

      if (!validStatus) {
        return NextResponse.json(
          { error: 'Invalid status format. Status must be uppercase with underscores.' },
          { status: 400 }
        );
      }

      // Check if the status exists for this project
      const statusExists = await db.query.projectTaskStatuses.findFirst({
        where: and(
          eq(projectTaskStatuses.project_id, task.project_id),
          eq(projectTaskStatuses.key, status)
        ),
      });

      if (!statusExists) {
        console.warn(`Status ${status} does not exist for project ${task.project_id}`);
        // We'll continue anyway, but log a warning
      }

      // Map the status to a valid enum value for the status field
      // The status field is an enum with limited values, while status_key can be any string
      let enumStatus = 'BACKLOG';
      if (status === 'BACKLOG' || status === 'TODO' || status === 'IN_PROGRESS' || status === 'DONE') {
        // If the status is one of the enum values, use it directly
        enumStatus = status;
      } else if (status === 'PLANNING' || status === 'FRONTEND' || status === 'BACKEND' || status === 'TESTING') {
        // Map custom statuses to the closest enum value
        enumStatus = 'IN_PROGRESS';
      } else if (status === 'ARCHIVED') {
        enumStatus = 'DONE';
      }

      // For the enum field, use a mapped value that's in the enum
      updateData.status = enumStatus as "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
      // Always update the status_key to the requested value - this is what we actually use
      updateData.status_key = status;
    } else if (status_key) {
      // If only status_key is provided, use it directly
      updateData.status_key = status_key;
    }

    // Handle other field updates
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (tech_icon !== undefined) updateData.tech_icon = tech_icon;

    // Handle tech_icons field - ensure it's stored as a JSON string in the database
    if (tech_icons !== undefined) {
      if (Array.isArray(tech_icons)) {
        // If it's already an array, stringify it
        updateData.tech_icons = JSON.stringify(tech_icons);
      } else if (typeof tech_icons === 'string') {
        try {
          // If it's a string, try to parse it to see if it's valid JSON
          JSON.parse(tech_icons);
          // If parsing succeeds, it's already a JSON string
          updateData.tech_icons = tech_icons;
        } catch (e) {
          // If parsing fails, it's a single icon string, wrap it in an array and stringify
          updateData.tech_icons = JSON.stringify([tech_icons]);
        }
      } else if (tech_icons === null) {
        // If null, store an empty array
        updateData.tech_icons = JSON.stringify([]);
      } else {
        // For any other type, convert to string and store
        updateData.tech_icons = JSON.stringify(tech_icons);
      }
    }

    console.log(`Updating task ${taskId} with data:`, updateData);

    // Update the task
    const [updatedTask] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}