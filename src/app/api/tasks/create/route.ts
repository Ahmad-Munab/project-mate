import { NextResponse } from 'next/server';
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { validateAuth, isValidStatusEnum } from "@/utils/task-status";

/**
 * POST: Create a new task
 */
export async function POST(request: Request) {
  try {
    // Validate authentication
    const auth = await validateAuth();
    if (auth.error) return auth.error;
    const user = auth.user;

    // Parse and validate request body
    const body = await request.json();
    const { projectId, title, description, priority, dueDate, status, status_key } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      );
    }

    // Determine the status values
    const taskStatus = status || 'BACKLOG';
    const validEnum = isValidStatusEnum(taskStatus);
    const finalStatus = validEnum ? taskStatus : 'BACKLOG';
    const finalStatusKey = status_key || taskStatus;

    // Create the task
    const [newTask] = await db.insert(tasks)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        priority,
        due_date: dueDate ? new Date(dueDate) : null,
        status: finalStatus,
        status_key: finalStatusKey,
        project_id: projectId,
        created_by: user.id,
      })
      .returning();

    return NextResponse.json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}