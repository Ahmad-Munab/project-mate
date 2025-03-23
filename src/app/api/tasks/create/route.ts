export const runtime = "edge";

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, title, description, priority, dueDate, status } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "Project ID and title are required" },
        { status: 400 }
      );
    }

    // Create the task
    const [newTask] = await db
      .insert(tasks)
      .values({
        title,
        description: description || null,
        priority,
        due_date: dueDate ? new Date(dueDate) : null, // Parse ISO string to Date
        status,
        project_id: projectId,
        created_by: user.id,
      })
      .returning();

    return NextResponse.json(newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
