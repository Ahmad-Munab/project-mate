import { NextResponse } from 'next/server';
import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateAuth, normalizeStatusKey } from "@/utils/task-status";

/**
 * GET: Fetch all task statuses for a project
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    // Validate authentication
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const { projectId } = await context.params;

    // Fetch all task statuses for the project, ordered by their order field
    const statuses = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, projectId),
      orderBy: projectTaskStatuses.order,
    });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching task statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task statuses' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new task status for a project
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    // Validate authentication
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const { projectId } = await context.params;

    // Parse and validate request body
    const body = await request.json();
    const { name, key, color, order } = body;

    if (!name || !key) {
      return NextResponse.json(
        { error: 'Name and key are required' },
        { status: 400 }
      );
    }

    // Normalize the key (uppercase, no spaces)
    const normalizedKey = normalizeStatusKey(key);

    // Check if a status with the same key already exists for this project
    const existingStatus = await db.query.projectTaskStatuses.findFirst({
      where: and(
        eq(projectTaskStatuses.project_id, projectId),
        eq(projectTaskStatuses.key, normalizedKey)
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
        name: name.trim(),
        key: normalizedKey,
        color: color || 'bg-gray-50 dark:bg-gray-900',
        order: typeof order === 'number' ? order : 0,
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