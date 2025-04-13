import { NextResponse } from 'next/server';
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateAuth, isValidStatusEnum, ValidStatusEnum } from "@/utils/task-status";

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
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}