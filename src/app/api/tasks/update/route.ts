import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    console.log('PATCH /api/tasks/update - Request received');
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
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'Task ID and status are required' },
        { status: 400 }
      );
    }

    // Update the task status and status_key
    console.log('Updating task:', taskId, 'to status:', status);
    try {
      // Check if the status is a valid enum value
      const isValidEnum = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'].includes(status);

      if (isValidEnum) {
        // If it's a valid enum value, update both status and status_key
        await db.update(tasks)
          .set({
            status, // Update the enum status
            status_key: status // Also update the custom status key
          })
          .where(eq(tasks.id, taskId));
      } else {
        // If it's not a valid enum value, only update status_key and set status to BACKLOG
        await db.update(tasks)
          .set({
            status: 'BACKLOG', // Set to a valid enum value
            status_key: status // Set the custom status key
          })
          .where(eq(tasks.id, taskId));
      }

      console.log('Task updated successfully');
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}