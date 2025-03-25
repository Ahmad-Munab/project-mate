import { Suspense } from "react";
import { getProjectTasks } from "@/lib/tasks";
import ProjectBoard from "@/components/kanban/ProjectBoard";
import ProjectSkeleton from "@/components/kanban/ProjectSkeleton";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const initialTasks = await getProjectTasks(projectId);

  return (
    <Suspense fallback={<ProjectSkeleton />}>
      <ProjectBoard projectId={projectId} initialTasks={initialTasks} />
    </Suspense>
  );
}
