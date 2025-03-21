import { Suspense } from "react";
import ProjectsList from "@/components/dashboard/ProjectsList";
import ProjectBoard from "@/components/dashboard/ProjectBoard";
import { ProjectSkeleton } from "@/components/dashboard/loading";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // Await the searchParams
  const params = await searchParams;
  const projectParam = params?.project;
  const projectId = typeof projectParam === 'string' ? projectParam.trim() : undefined;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with projects list */}
      <aside className="w-64 border-r border-border bg-sidebar">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
        <Suspense fallback={<ProjectSkeleton />}>
          <ProjectsList />
        </Suspense>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<ProjectSkeleton />}>
          <ProjectBoard projectId={projectId} />
        </Suspense>
      </main>
    </div>
  );
}
