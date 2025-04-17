import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectTaskStatuses, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_STATUSES, isValidStatusEnum, normalizeStatusKey } from "./task-status-client";
import type { ValidStatusEnum } from "./task-status-client";

// Server-side default statuses with more columns for better task organization
const SERVER_DEFAULT_STATUSES = [
  {
    name: "Backlog",
    key: "BACKLOG",
    color: "bg-gray-50 dark:bg-gray-900",
    order: 0,
    is_default: true,
  },
  {
    name: "Planning",
    key: "PLANNING",
    color: "bg-blue-50 dark:bg-blue-900/20",
    order: 1,
    is_default: false,
  },
  {
    name: "Frontend",
    key: "FRONTEND",
    color: "bg-indigo-50 dark:bg-indigo-900/20",
    order: 2,
    is_default: false,
  },
  {
    name: "Backend",
    key: "BACKEND",
    color: "bg-green-50 dark:bg-green-900/20",
    order: 3,
    is_default: false,
  },
  {
    name: "Testing",
    key: "TESTING",
    color: "bg-purple-50 dark:bg-purple-900/20",
    order: 4,
    is_default: false,
  },
  {
    name: "Done",
    key: "DONE",
    color: "bg-emerald-50 dark:bg-emerald-900/20",
    order: 5,
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
