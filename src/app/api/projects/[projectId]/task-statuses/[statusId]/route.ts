import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectTaskStatuses, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH: Update a task status
export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string; statusId: string } }
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

    const { projectId, statusId } = params;
    const body = await request.json();
    const { name, color, order } = body;

    // First, check if the status exists and belongs to the project
    const existingStatus = await db.query.projectTaskStatuses.findFirst({
      where: and(
        eq(projectTaskStatuses.id, statusId),
        eq(projectTaskStatuses.project_id, projectId)
      ),
    });

    if (!existingStatus) {
      return NextResponse.json(
        { error: 'Task status not found' },
        { status: 404 }
      );
    }

    // Check if this is a default status (BACKLOG) which should be protected
    if (existingStatus.is_default && existingStatus.key === 'BACKLOG') {
      // For BACKLOG, only allow updating the color and order, not the name
      const updateData: Partial<typeof projectTaskStatuses.$inferInsert> = {
        updated_at: new Date(),
      };

      if (color) updateData.color = color;
      if (order !== undefined) updateData.order = order;

      const [updatedStatus] = await db.update(projectTaskStatuses)
        .set(updateData)
        .where(eq(projectTaskStatuses.id, statusId))
        .returning();

      return NextResponse.json(updatedStatus);
    }

    // For non-BACKLOG statuses, allow updating name, color, and order
    const updateData: Partial<typeof projectTaskStatuses.$inferInsert> = {
      updated_at: new Date(),
    };

    if (name) updateData.name = name;
    if (color) updateData.color = color;
    if (order !== undefined) updateData.order = order;

    const [updatedStatus] = await db.update(projectTaskStatuses)
      .set(updateData)
      .where(eq(projectTaskStatuses.id, statusId))
      .returning();

    return NextResponse.json(updatedStatus);
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a task status
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string; statusId: string } }
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

    const { projectId, statusId } = params;

    // First, check if the status exists and belongs to the project
    const existingStatus = await db.query.projectTaskStatuses.findFirst({
      where: and(
        eq(projectTaskStatuses.id, statusId),
        eq(projectTaskStatuses.project_id, projectId)
      ),
    });

    if (!existingStatus) {
      return NextResponse.json(
        { error: 'Task status not found' },
        { status: 404 }
      );
    }

    // Check if this is a default status (BACKLOG) which should be protected
    if (existingStatus.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default task status' },
        { status: 400 }
      );
    }

    // Check if there are any tasks using this status
    const tasksWithStatus = await db.query.tasks.findMany({
      where: and(
        eq(tasks.project_id, projectId),
        eq(tasks.status_key, existingStatus.key)
      ),
    });

    // If there are tasks with this status, move them to BACKLOG
    if (tasksWithStatus.length > 0) {
      // Find the BACKLOG status
      const backlogStatus = await db.query.projectTaskStatuses.findFirst({
        where: and(
          eq(projectTaskStatuses.project_id, projectId),
          eq(projectTaskStatuses.key, 'BACKLOG')
        ),
      });

      if (!backlogStatus) {
        return NextResponse.json(
          { error: 'BACKLOG status not found' },
          { status: 500 }
        );
      }

      // Update all tasks with this status to BACKLOG
      await db.update(tasks)
        .set({
          status: 'BACKLOG', // Update the enum status
          status_key: 'BACKLOG' // Update the custom status key
        })
        .where(and(
          eq(tasks.project_id, projectId),
          eq(tasks.status_key, existingStatus.key)
        ));
    }

    // Delete the task status
    await db.delete(projectTaskStatuses)
      .where(eq(projectTaskStatuses.id, statusId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task status:', error);
    return NextResponse.json(
      { error: 'Failed to delete task status' },
      { status: 500 }
    );
  }
}