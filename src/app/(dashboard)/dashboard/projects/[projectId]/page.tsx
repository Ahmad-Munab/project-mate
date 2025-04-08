import { Suspense } from "react";
import { getProjectTasks } from "@/lib/tasks";
import ProjectBoard from "@/components/kanban/ProjectBoard";
import ProjectSkeleton from "@/components/kanban/ProjectSkeleton";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import ProjectPageWrapper from "@/components/dashboard/project-page-wrapper";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // Get the current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('Project Page: No authenticated user found');
    return (
      <div className="flex items-center justify-center h-full">
        <p>Please log in to view this project</p>
      </div>
    );
  }

  console.log(`Project Page: Loading project ${projectId} for user ${user.id}`);

  // Get the project details
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    console.log(`Project Page: Project ${projectId} not found`);
    return (
      <div className="flex items-center justify-center h-full">
        <p>Project not found</p>
      </div>
    );
  }

  // Get the user's role in this project
  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, user.id)
      )
    );

  console.log(`Project Page: User membership:`, membership || 'none');

  const initialTasks = await getProjectTasks(projectId);

  // Check if current user is the project owner
  const isOwner = project.ownerId === user.id;
  console.log(`Project Page: User is owner: ${isOwner}`);

  return (
    <ProjectPageWrapper project={project}>
      <Suspense fallback={<ProjectSkeleton />}>
        <ProjectBoard
          projectId={projectId}
          initialTasks={initialTasks}
          isOwner={isOwner}
        />
      </Suspense>
    </ProjectPageWrapper>
  );
}


