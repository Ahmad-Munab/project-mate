import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET: Fetch all task statuses for a project
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log('GET task statuses for project:', params.projectId);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const projectId = params.projectId;

    // Fetch all task statuses for the project, ordered by their order field
    console.log('Fetching task statuses from database...');
    const statuses = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, projectId),
      orderBy: projectTaskStatuses.order,
    });
    console.log('Found statuses:', statuses.length);

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching task statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task statuses' },
      { status: 500 }
    );
  }
}

// POST: Create a new task status for a project
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const projectId = params.projectId;
    const body = await request.json();
    const { name, key, color, order } = body;

    if (!name || !key) {
      return NextResponse.json(
        { error: 'Name and key are required' },
        { status: 400 }
      );
    }

    // Check if a status with the same key already exists for this project
    const existingStatus = await db.query.projectTaskStatuses.findFirst({
      where: and(
        eq(projectTaskStatuses.project_id, projectId),
        eq(projectTaskStatuses.key, key)
      ),
    });

    if (existingStatus) {
      return NextResponse.json(
        { error: 'A status with this key already exists' },
        { status: 400 }
      );
    }

    // Create the new task status
    const [newStatus] = await db.insert(projectTaskStatuses)
      .values({
        project_id: projectId,
        name,
        key,
        color: color || 'bg-gray-50 dark:bg-gray-900',
        order: order || 0,
        is_default: false, // User-created statuses are never default
      })
      .returning();

    return NextResponse.json(newStatus);
  } catch (error) {
    console.error('Error creating task status:', error);
    return NextResponse.json(
      { error: 'Failed to create task status' },
      { status: 500 }
    );
  }
}