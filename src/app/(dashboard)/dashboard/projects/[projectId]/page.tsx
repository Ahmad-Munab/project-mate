import { Suspense } from "react";
import { getProjectTasks } from "@/lib/tasks";
import ProjectBoard from "@/components/dashboard/ProjectBoard";
import ProjectSkeleton from "@/components/dashboard/ProjectSkeleton";

interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = params;

  // Fetch initial tasks
  const initialTasks = await getProjectTasks(projectId);

  return (
    <Suspense fallback={<ProjectSkeleton />}>
      <ProjectBoard projectId={projectId} initialTasks={initialTasks} />
    </Suspense>
  );
}
