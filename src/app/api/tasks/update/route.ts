import { NextResponse } from 'next/server';
import { db } from "@/db";
import { tasks, projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateAuth, isValidStatusEnum } from "@/utils/task-status";

/**
 * PATCH: Update a task's status
 */
export async function PATCH(request: Request) {
  try {
    // Validate authentication
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    // Parse and validate request body
    const body = await request.json();
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'Task ID and status are required' },
        { status: 400 }
      );
    }

    // Check if the status is a valid format
    const validStatus = isValidStatusEnum(status);

    if (!validStatus) {
      return NextResponse.json(
        { error: 'Invalid status format. Status must be uppercase with underscores.' },
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

    // Update the task
    const [updatedTask] = await db.update(tasks)
      .set({
        // For the enum field, use a known valid value if possible, otherwise BACKLOG
        // This is just for backward compatibility
        status: isValidStatusEnum(status) ? status : 'BACKLOG',
        // Always update the status_key to the requested value - this is what we actually use
        status_key: status
      })
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