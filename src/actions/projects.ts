'use server';

import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function getProjects() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/signin");
  }

  try {
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, user.id));

    return userProjects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}