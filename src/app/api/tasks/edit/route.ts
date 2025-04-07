import { NextResponse } from 'next/server';
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateAuth, isValidStatusEnum } from "@/utils/task-status";

/**
 * PATCH: Edit a task's details
 */
export async function PATCH(request: Request) {
  try {
    // Validate authentication
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    // Parse and validate request body
    const body = await request.json();
    const { taskId, title, description, priority, status, status_key } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Partial<typeof tasks.$inferInsert> = {};

    // Update fields if provided
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority) updateData.priority = priority;

    // Handle status update
    if (status) {
      // Check if the status is a valid enum value
      const validEnum = isValidStatusEnum(status);

      // Set status based on validity
      updateData.status = validEnum ? status : 'BACKLOG';

      // If status_key is explicitly provided, use it, otherwise use status
      updateData.status_key = status_key || status;
    }

    // Update the task
    const [updatedTask] = await db.update(tasks)
      .set(updateData)
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
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}