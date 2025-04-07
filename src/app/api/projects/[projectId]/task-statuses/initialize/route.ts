import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq } from "drizzle-orm";

// Default task statuses to initialize for a new project
const DEFAULT_STATUSES = [
  {
    name: "Backlog",
    key: "BACKLOG",
    color: "bg-gray-50 dark:bg-gray-900",
    order: 0,
    is_default: true,
  },
  {
    name: "To Do",
    key: "TODO",
    color: "bg-neutral-50 dark:bg-neutral-900",
    order: 1,
    is_default: false,
  },
  {
    name: "In Progress",
    key: "IN_PROGRESS",
    color: "bg-blue-50 dark:bg-blue-900/20",
    order: 2,
    is_default: false,
  },
  {
    name: "Done",
    key: "DONE",
    color: "bg-green-50 dark:bg-green-900/20",
    order: 3,
    is_default: false,
  },
];

// POST: Initialize default task statuses for a project
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log('Initializing task statuses for project:', params.projectId);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const projectId = params.projectId;

    // Check if the project already has task statuses
    console.log('Checking for existing task statuses...');
    const existingStatuses = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, projectId),
    });
    console.log('Existing statuses:', existingStatuses.length);

    if (existingStatuses.length > 0) {
      return NextResponse.json(
        { message: 'Project already has task statuses', statuses: existingStatuses },
        { status: 200 }
      );
    }

    // Initialize default task statuses
    console.log('Creating default task statuses...');
    const createdStatuses = [];

    try {
      for (const status of DEFAULT_STATUSES) {
        console.log('Creating status:', status.name);
        const [newStatus] = await db.insert(projectTaskStatuses)
          .values({
            project_id: projectId,
            name: status.name,
            key: status.key,
            color: status.color,
            order: status.order,
            is_default: status.is_default,
          })
          .returning();

        createdStatuses.push(newStatus);
      }
      console.log('Default statuses created successfully');
    } catch (insertError) {
      console.error('Error inserting task statuses:', insertError);
      throw insertError;
    }

    // Fetch the newly created statuses
    console.log('Fetching newly created statuses...');
    const newStatuses = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, projectId),
      orderBy: projectTaskStatuses.order,
    });
    console.log('New statuses count:', newStatuses.length);

    return NextResponse.json(newStatuses);
  } catch (error) {
    console.error('Error initializing task statuses:', error);
    return NextResponse.json(
      { error: 'Failed to initialize task statuses' },
      { status: 500 }
    );
  }
}