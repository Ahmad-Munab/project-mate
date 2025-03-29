"use server"

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function getProjectTasks(project_id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/signin");
  }

  try {
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, project_id))
      .orderBy(tasks.created_at);

    return projectTasks;
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    return [];
  }
}
