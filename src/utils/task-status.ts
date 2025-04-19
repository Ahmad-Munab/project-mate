import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectTaskStatuses, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_STATUSES, isValidStatusEnum, normalizeStatusKey } from "./task-status-client";
import type { ValidStatusEnum } from "./task-status-client";

// Minimal default statuses for when AI generation fails
const SERVER_DEFAULT_STATUSES = [
  {
    name: "Backlog",
    key: "BACKLOG",
    color: "bg-gray-50 dark:bg-gray-900",
    order: 0,
    is_default: true,
  },
  {
    name: "In Progress",
    key: "IN_PROGRESS",
    color: "bg-blue-50 dark:bg-blue-900/20",
    order: 1,
    is_default: false,
  },
  {
    name: "Done",
    key: "DONE",
    color: "bg-emerald-50 dark:bg-emerald-900/20",
    order: 2,
    is_default: false,
  },
];

// Re-export for convenience
export { DEFAULT_STATUSES, isValidStatusEnum, normalizeStatusKey, ValidStatusEnum, SERVER_DEFAULT_STATUSES };

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
  // Map the custom status key to one of the enum values if possible, or use BACKLOG as default
  const statusEnumValue = (['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'].includes(toStatusKey))
    ? toStatusKey as 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE'
    : 'BACKLOG';

  await tx.update(tasks)
    .set({
      status: statusEnumValue,
      status_key: toStatusKey
    })
    .where(and(
      eq(tasks.project_id, projectId),
      eq(tasks.status_key, fromStatusKey)
    ));
}
