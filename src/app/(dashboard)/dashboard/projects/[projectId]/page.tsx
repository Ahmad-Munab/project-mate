import { Suspense } from "react";
import { getProjectTasks } from "@/lib/tasks";
import ProjectBoard from "@/components/kanban/ProjectBoard";
import ProjectSkeleton from "@/components/kanban/ProjectSkeleton";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  // Get the current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get the project details
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  const initialTasks = await getProjectTasks(projectId);
  
  // Check if current user is the project owner
  const isOwner = project?.ownerId === user?.id;

  return (
    <Suspense fallback={<ProjectSkeleton />}>
      <ProjectBoard projectId={projectId} initialTasks={initialTasks} isOwner={isOwner} />
    </Suspense>
  );
}


