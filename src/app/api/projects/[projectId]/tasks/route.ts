import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Extract projectId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const projectId = pathParts[pathParts.length - 2]; // projectId is the second-to-last part

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

    // projectId is already extracted from URL

    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId));

    return NextResponse.json(projectTasks);
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
