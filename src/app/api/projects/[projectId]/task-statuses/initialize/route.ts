import { NextResponse } from 'next/server';
import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateAuth, DEFAULT_STATUSES } from "@/utils/task-status";

/**
 * POST: Initialize default task statuses for a project
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    // Validate authentication
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const { projectId } = await context.params;

    // Check if the project already has task statuses
    const existingStatuses = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, projectId),
    });

    if (existingStatuses.length > 0) {
      return NextResponse.json(
        { message: 'Project already has task statuses', statuses: existingStatuses },
        { status: 200 }
      );
    }

    // Initialize default task statuses without a transaction for better error handling
    const statuses = [];

    // First check which statuses already exist
    const existingStatusMap: Record<string, { id: string; name: string; key: string; color: string }> = {};
    for (const existingStatus of existingStatuses) {
      existingStatusMap[existingStatus.key] = existingStatus;
    }

    // Process each default status individually
    for (const status of DEFAULT_STATUSES) {
      try {
        // Skip if status already exists
        if (existingStatusMap[status.key]) {
          statuses.push(existingStatusMap[status.key]);
          continue;
        }

        // Create the status if it doesn't exist
        const [newStatus] = await db.insert(projectTaskStatuses)
          .values({
            project_id: projectId,
            name: status.name,
            key: status.key,
            color: status.color || 'bg-gray-50 dark:bg-gray-900',
            order: typeof status.order === 'number' ? status.order : 0,
            is_default: status.is_default || false,
          })
          .returning();

        if (newStatus) {
          statuses.push(newStatus);
          console.log(`Created status: ${status.name} (${status.key})`);
        }
      } catch (statusError) {
        console.error(`Error creating status ${status.key}:`, statusError);
        // Continue with other statuses even if one fails
      }
    }

    // If we have no statuses yet, create at least a BACKLOG status as fallback
    if (statuses.length === 0 && !existingStatusMap['BACKLOG']) {
      try {
        console.log('Creating fallback BACKLOG status');
        const [backlogStatus] = await db.insert(projectTaskStatuses)
          .values({
            project_id: projectId,
            name: 'Backlog',
            key: 'BACKLOG',
            color: 'bg-gray-50 dark:bg-gray-900',
            order: 0,
            is_default: true,
          })
          .returning();

        if (backlogStatus) {
          statuses.push(backlogStatus);
          console.log('Created fallback BACKLOG status successfully');
        }
      } catch (backlogError) {
        console.error('Error creating fallback BACKLOG status:', backlogError);
      }
    }

    // If we didn't create any statuses, fetch what exists now
    if (statuses.length === 0) {
      const currentStatuses = await db.query.projectTaskStatuses.findMany({
        where: eq(projectTaskStatuses.project_id, projectId),
      });

      return NextResponse.json(currentStatuses);
    }

    const newStatuses = statuses;

    return NextResponse.json(newStatuses);
  } catch (error) {
    console.error('Error initializing task statuses:', error);
    return NextResponse.json(
      { error: 'Failed to initialize task statuses' },
      { status: 500 }
    );
  }
}