'use server'

import { db } from "@/db";
import { projects, projectMembers, users } from "@/db/schema";
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

      // Fetch projects with member roles and owner information
      const userProjects = await db
        .select({
          project: projects,
          memberRole: projectMembers.role,
          ownerId: projects.ownerId,
          ownerInfo: users
        })
        .from(projects)
        .innerJoin(
          projectMembers,
          eq(projects.id, projectMembers.projectId)
        )
        .leftJoin(
          users,
          eq(projects.ownerId, users.id)
        )
        .where(eq(projectMembers.userId, user.id));

      console.log("Server: Successfully fetched projects:", userProjects);

      // Map the projects to match the expected structure in the dashboard
      const mappedProjects = userProjects.map(({ project, memberRole, ownerId, ownerInfo }) => ({
        id: project.id,
        name: project.name || 'Untitled Project',
        description: project.description || '',
        progress: 0, // You might want to calculate this based on tasks
        members: [], // You might want to fetch this separately if needed
        tasks: [], // You might want to fetch this separately if needed
        isOwner: ownerId === user.id,
        myRole: memberRole,
        ownerInfo: ownerId !== user.id ? {
          name: ownerInfo?.email?.split('@')[0] || 'Unknown User', // Or any other user display name logic
          avatar: '', // Default empty avatar
        } : undefined,
      }));

      console.log("Server: Mapped projects:", mappedProjects);
      return mappedProjects;

    } catch (error) {
      console.error("Server: Database query failed:", error);
      throw error;
    }
  } catch (error) {
    console.error("Server: Project fetch failed:", error);
    throw error;
  }
}
