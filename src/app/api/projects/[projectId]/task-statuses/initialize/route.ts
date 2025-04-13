import { NextResponse } from 'next/server';
import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
    const existingStatusMap: Record<string, any> = {};
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
            color: status.color,
            order: status.order,
            is_default: status.is_default,
          })
          .returning();

        if (newStatus) {
          statuses.push(newStatus);
        }
      } catch (statusError) {
        console.error(`Error creating status ${status.key}:`, statusError);
        // Continue with other statuses even if one fails
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