import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    console.log('PATCH /api/tasks/edit - Request received');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);
    const { taskId, title, description, priority, status, status_key } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const updateData: Partial<typeof tasks.$inferInsert> = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (status) {
      // Check if the status is a valid enum value
      const isValidEnum = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'].includes(status);

      if (isValidEnum) {
        // If it's a valid enum value, update both status and status_key
        updateData.status = status;
      } else {
        // If it's not a valid enum value, set status to BACKLOG
        updateData.status = 'BACKLOG';
      }

      // If status_key is explicitly provided, use it, otherwise use status
      updateData.status_key = status_key || status;
    }

    const [updatedTask] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}