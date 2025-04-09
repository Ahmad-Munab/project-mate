import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projects, projectMembers, tasks, aiSuggestions, projectTaskStatuses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Delete in the correct order to respect foreign key constraints

    // 1. First delete all AI suggestions associated with the project
    await db
      .delete(aiSuggestions)
      .where(eq(aiSuggestions.projectId, projectId));

    // 2. Delete all task statuses associated with the project
    await db
      .delete(projectTaskStatuses)
      .where(eq(projectTaskStatuses.project_id, projectId));

    // 3. Delete all tasks associated with the project
    await db
      .delete(tasks)
      .where(eq(tasks.project_id, projectId));

    // 4. Delete project members
    await db
      .delete(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    // 5. Finally delete the project
    await db
      .delete(projects)
      .where(eq(projects.id, projectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
