import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { projects, projectMembers, tasks, projectTaskStatuses } from "@/db/schema";
import { generateProjectPlan } from "@/lib/ai/tools/project-creator";

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

    // Generate the project plan with better error handling
    let plan;
    try {
      plan = await generateProjectPlan(idea);
    } catch (planError) {
      console.error("Error generating project plan:", planError);
      return NextResponse.json(
        { error: "Failed to generate project plan. Please try again with a different description." },
        { status: 500 }
      );
    }

    // Validate the plan structure
    if (!plan || !plan.name || !plan.description || !Array.isArray(plan.tasks) || !Array.isArray(plan.columns)) {
      console.error("Invalid project plan structure:", plan);
      return NextResponse.json(
        { error: "Invalid project plan structure. Please try again with a more detailed description." },
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

    // Create task statuses/columns first
    console.log(`Creating ${plan.columns.length} columns for project ${newProject.id}`);

    // Process columns one by one to ensure they're created properly
    for (let i = 0; i < plan.columns.length; i++) {
      const column = plan.columns[i];

      try {
        // Create the column
        const [newColumn] = await db.insert(projectTaskStatuses)
          .values({
            project_id: newProject.id,
            name: column.name,
            key: column.key,
            color: column.color || 'bg-gray-50 dark:bg-gray-900',
            is_default: column.key === 'BACKLOG', // Make BACKLOG the default column
            order: i, // Set the order based on the index in the columns array
          })
          .returning();

        console.log(`Created column: ${column.name} (${column.key}) with order ${i}`);
      } catch (columnError) {
        console.error(`Error creating column ${column.name} (${column.key}):`, columnError);
      }
    }

    // Fetch all columns after creation to ensure we have the latest data
    const createdColumns = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, newProject.id),
    });

    console.log(`Created ${createdColumns.length} columns for project ${newProject.id}:`,
      createdColumns.map(col => `${col.name} (${col.key})`).join(', '));

    // Get all valid column keys from the created columns
    const validColumnKeys = createdColumns.map(col => col.key);

    // Create tasks with the appropriate status keys
    console.log(`Creating ${plan.tasks.length} tasks for project ${newProject.id}`);

    // Process tasks one by one to ensure they're created properly
    const createdTasks = [];
    for (const task of plan.tasks) {
      try {
        // Ensure task status is a valid column key
        const taskStatus = validColumnKeys.includes(task.status) ? task.status : 'BACKLOG';

        // Map to enum values for backward compatibility
        const enumStatus =
          taskStatus === 'BACKLOG' ? 'BACKLOG' :
          taskStatus === 'TODO' ? 'TODO' :
          taskStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' :
          taskStatus === 'DONE' ? 'DONE' : 'BACKLOG';

        // Map priority to enum values
        const priority =
          task.priority === 'LOW' ? 'LOW' :
          task.priority === 'MEDIUM' ? 'MEDIUM' :
          task.priority === 'HIGH' ? 'HIGH' :
          task.priority === 'URGENT' ? 'URGENT' : 'MEDIUM';

        // Create the task
        const [newTask] = await db.insert(tasks)
          .values({
            title: task.title,
            description: task.description,
            status: enumStatus,
            status_key: taskStatus,
            priority: priority,
            project_id: newProject.id,
            created_by: user.id,
          })
          .returning();

        createdTasks.push(newTask);
        console.log(`Created task: ${task.title} in column ${taskStatus}`);
      } catch (taskError) {
        console.error(`Error creating task ${task.title}:`, taskError);
      }
    }

    console.log(`Created ${createdTasks.length} tasks for project ${newProject.id}`);

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
