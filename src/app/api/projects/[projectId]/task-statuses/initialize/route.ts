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

    // Initialize default task statuses in a transaction for atomicity
    const newStatuses = await db.transaction(async (tx) => {
      const statuses = [];

      for (const status of DEFAULT_STATUSES) {
        const [newStatus] = await tx.insert(projectTaskStatuses)
          .values({
            project_id: projectId,
            name: status.name,
            key: status.key,
            color: status.color,
            order: status.order,
            is_default: status.is_default,
          })
          .returning();

        statuses.push(newStatus);
      }

      return statuses;
    });

    return NextResponse.json(newStatuses);
  } catch (error) {
    console.error('Error initializing task statuses:', error);
    return NextResponse.json(
      { error: 'Failed to initialize task statuses' },
      { status: 500 }
    );
  }
}