import { Suspense } from "react";
import ProjectBoard from "@/components/dashboard/ProjectBoard";
import ProjectsList from "@/components/dashboard/ProjectsList";
import ProjectSkeleton from "@/components/dashboard/ProjectSkeleton";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getProjectTasks(projectId: string) {
  if (!projectId) {
    return [];
  }

  try {
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId));

    return projectTasks;
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    return [];
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  const projectId = searchParams.project;
  const initialTasks = projectId ? await getProjectTasks(projectId) : [];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-sidebar">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
        <Suspense fallback={<ProjectSkeleton />}>
          <ProjectsList />
        </Suspense>
      </aside>

      <main className="flex-1 overflow-hidden">
        <ProjectBoard projectId={projectId} initialTasks={initialTasks} />
      </main>
    </div>
  );
}
