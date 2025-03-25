'use server'

import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function getProjects() {
  try {
    console.log("Server: Fetching projects");
    
    const supabase = await createClient();
  
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("Server: Auth check result:", { userId: user?.id, hasError: !!authError });

    if (authError || !user) {
      console.log("Server: Authentication failed, redirecting to signin");
      redirect("/signin");
    }

    try {
      console.log("Server: Attempting to fetch projects for user:", user.id);

      const userProjects = await db
        .select()
        .from(projects)
        .innerJoin(
          projectMembers,
          eq(projects.id, projectMembers.projectId)
        )
        .where(eq(projectMembers.userId, user.id));

      console.log("Server: Successfully fetched projects:", userProjects);

      // Map the projects to match the expected structure in the dashboard
      const mappedProjects = userProjects.map(({ projects: project }) => ({
        id: project.id,
        name: project.name || 'Untitled Project',
        description: project.description || '',
        progress: 0,
        members: [],
        tasks: [],
      }));

      console.log("Server: Mapped projects:", mappedProjects);
      return mappedProjects;

    } catch (error) {
      console.error("Server: Error fetching projects:", error);
      return [];
    }
  } catch (error) {
    console.error("Server: Error fetching projects:", error);
    throw error;
  }
}
