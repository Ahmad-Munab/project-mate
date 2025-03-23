export const runtime = "edge";

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projects, projectMembers, tasks } from "@/db/schema";
import { generateProjectPlan } from "@/app/(dashboard)/projects/new/generatePlan";

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

    const formData = await request.formData();
    const idea = formData.get("idea") as string;

    if (!idea) {
      return NextResponse.json(
        { error: "Project idea is required" },
        { status: 400 }
      );
    }

    const plan = await generateProjectPlan(idea);

    if (!plan.name || !plan.description || !Array.isArray(plan.tasks)) {
      return NextResponse.json(
        { error: "Invalid AI response structure" },
        { status: 500 }
      );
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        name: plan.name,
        description: plan.description,
        ownerId: user.id,
      })
      .returning();

    if (!newProject?.id) {
      return NextResponse.json(
        { error: "Failed to create project record" },
        { status: 500 }
      );
    }

    // Add the creator as a project member
    await db.insert(projectMembers).values({
      projectId: newProject.id,
      userId: user.id,
      role: "OWNER",
    });

    // Create initial tasks
    const taskPromises = plan.tasks.map((task) =>
      db.insert(tasks).values({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: newProject.id,
        created_by: user.id,
      })
    );

    await Promise.all(taskPromises);

    return NextResponse.json({
      success: true,
      projectId: newProject.id,
    });
  } catch (error) {
    console.error("Project creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
