import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";

export async function POST(request: Request) {
  try {
    console.log('POST /api/tasks/create - Request received');
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
    const { projectId, title, description, priority, dueDate, status, status_key } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      );
    }

    // Check if the status is a valid enum value
    const taskStatus = status || 'BACKLOG';
    const isValidEnum = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'].includes(taskStatus);

    // Determine the status to use
    const finalStatus = isValidEnum ? taskStatus : 'BACKLOG';
    const finalStatusKey = status_key || taskStatus;

    console.log('Creating task with status:', finalStatus, 'and status_key:', finalStatusKey);

    // Create the task
    const [newTask] = await db.insert(tasks)
      .values({
        title,
        description: description || null,
        priority,
        due_date: dueDate ? new Date(dueDate) : null, // Parse ISO string to Date
        status: finalStatus, // Use a valid enum value
        status_key: finalStatusKey, // Use status_key if provided, otherwise use status
        project_id: projectId,
        created_by: user.id,
      })
      .returning();

    return NextResponse.json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
