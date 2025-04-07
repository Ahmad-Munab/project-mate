import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectTaskStatuses, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { VALID_STATUS_ENUMS, DEFAULT_STATUSES, isValidStatusEnum, normalizeStatusKey } from "./task-status-client";
import type { ValidStatusEnum } from "./task-status-client";

// Re-export for convenience
export { VALID_STATUS_ENUMS, DEFAULT_STATUSES, isValidStatusEnum, normalizeStatusKey, ValidStatusEnum };

/**
 * Validates user authentication
 * @returns User object or error response
 */
export async function validateAuth() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  return { user };
}

/**
 * Fetches a task status and validates it belongs to the project
 * @param projectId Project ID
 * @param statusId Status ID
 * @returns Task status or error response
 */
export async function getTaskStatus(projectId: string, statusId: string) {
  const status = await db.query.projectTaskStatuses.findFirst({
    where: and(
      eq(projectTaskStatuses.id, statusId),
      eq(projectTaskStatuses.project_id, projectId)
    ),
  });

  if (!status) {
    return { error: NextResponse.json({ error: 'Task status not found' }, { status: 404 }) };
  }

  return { status };
}

/**
 * Moves tasks from one status to another
 * @param tx Transaction object
 * @param projectId Project ID
 * @param fromStatusKey Source status key
 * @param toStatusKey Target status key
 */
export async function moveTasksToStatus(
  tx: { update: typeof db.update },
  projectId: string,
  fromStatusKey: string,
  toStatusKey: string
) {
  await tx.update(tasks)
    .set({
      status: isValidStatusEnum(toStatusKey) ? toStatusKey as ValidStatusEnum : 'BACKLOG',
      status_key: toStatusKey
    })
    .where(and(
      eq(tasks.project_id, projectId),
      eq(tasks.status_key, fromStatusKey)
    ));
}
