import { NextResponse } from 'next/server';
import { db } from "@/db";
import { projectTaskStatuses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateAuth } from "@/utils/task-status";
import { SERVER_DEFAULT_STATUSES } from "@/utils/task-status";

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

    // Check if we already have all the default statuses
    const existingKeys = existingStatuses.map(status => status.key);
    const allDefaultStatusesExist = SERVER_DEFAULT_STATUSES.every(status =>
      existingKeys.includes(status.key)
    );

    // If we already have all the default statuses, just return them
    if (allDefaultStatusesExist) {
      console.log(`Project ${projectId} already has all default statuses:`,
        existingStatuses.map(s => `${s.name} (${s.key})`).join(', '));
      return NextResponse.json(
        { message: 'Project already has all task statuses', statuses: existingStatuses },
        { status: 200 }
      );
    }

    // Initialize default task statuses without a transaction for better error handling
    const statuses = [];

    // Create a map of existing statuses by key for quick lookup
    const existingStatusMap: Record<string, any> = {};
    for (const existingStatus of existingStatuses) {
      existingStatusMap[existingStatus.key] = existingStatus;
    }

    console.log(`Project ${projectId} has ${existingStatuses.length} existing statuses. Adding missing ones.`);

    // Process each default status individually
    for (const status of SERVER_DEFAULT_STATUSES) {
      try {
        // Skip if status already exists
        if (existingStatusMap[status.key]) {
          console.log(`Status ${status.key} already exists, skipping creation`);
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

        // If it's a duplicate key error, try to fetch the existing status
        const errorMessage = statusError instanceof Error ? statusError.message : String(statusError);
        if (errorMessage.includes('duplicate key value violates unique constraint')) {
          try {
            // Fetch the existing status
            const existingStatus = await db.query.projectTaskStatuses.findFirst({
              where: and(
                eq(projectTaskStatuses.project_id, projectId),
                eq(projectTaskStatuses.key, status.key)
              ),
            });

            if (existingStatus && !statuses.some(s => s.key === status.key)) {
              // Add the existing status to our list
              statuses.push(existingStatus);
              console.log(`Found existing ${status.key} status after duplicate key error`);
            }
          } catch (fetchError) {
            console.error(`Error fetching existing ${status.key} status:`, fetchError);
          }
        }
        // Continue with other statuses even if one fails
      }
    }

    // If we have no statuses yet, create at least a BACKLOG status as fallback
    if (statuses.length === 0) {
      try {
        console.log('Creating fallback BACKLOG status');

        // Check if BACKLOG already exists
        if (!existingStatusMap['BACKLOG']) {
          try {
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

            // Try to fetch the BACKLOG status if it exists but we couldn't create it
            try {
              const existingBacklog = await db.query.projectTaskStatuses.findFirst({
                where: and(
                  eq(projectTaskStatuses.project_id, projectId),
                  eq(projectTaskStatuses.key, 'BACKLOG')
                ),
              });

              if (existingBacklog) {
                statuses.push(existingBacklog);
                console.log('Found existing BACKLOG status');
              }
            } catch (fetchError) {
              console.error('Error fetching existing BACKLOG status:', fetchError);
            }
          }
        } else {
          // Use the existing BACKLOG status
          statuses.push(existingStatusMap['BACKLOG']);
          console.log('Using existing BACKLOG status');
        }
      } catch (backlogError) {
        console.error('Error handling BACKLOG status:', backlogError);
      }
    }

    // Always fetch all current statuses to ensure we return everything
    // This handles race conditions where statuses might have been created in parallel
    const currentStatuses = await db.query.projectTaskStatuses.findMany({
      where: eq(projectTaskStatuses.project_id, projectId),
      orderBy: projectTaskStatuses.order,
    });

    console.log(`Returning ${currentStatuses.length} statuses for project ${projectId}:`,
      currentStatuses.map(s => `${s.name} (${s.key})`).join(', '));

    return NextResponse.json(currentStatuses);
  } catch (error) {
    console.error('Error initializing task statuses:', error);
    return NextResponse.json(
      { error: 'Failed to initialize task statuses' },
      { status: 500 }
    );
  }
}