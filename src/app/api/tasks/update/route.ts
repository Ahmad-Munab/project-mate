import { NextResponse } from 'next/server';
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    // Check if the status is a valid enum value
    const validEnum = isValidStatusEnum(status);

    // Update the task
    const [updatedTask] = await db.update(tasks)
      .set({
        // If valid enum, use it; otherwise default to BACKLOG
        status: validEnum ? status : 'BACKLOG',
        // Always update the status_key to the requested value
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