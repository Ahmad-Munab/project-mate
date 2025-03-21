import { Suspense } from "react";
import { getProjectTasks } from "@/lib/tasks";
import ProjectBoard from "@/components/dashboard/ProjectBoard";
import ProjectsList from "@/components/dashboard/ProjectsList";
import ProjectSkeleton from "@/components/dashboard/ProjectSkeleton";
import { UserNav } from "@/components/dashboard/UserNav";
import { Search } from "@/components/dashboard/Search";

type SearchParams = {
  project?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  // Handle the promise resolution
  const resolvedParams = await Promise.resolve(searchParams);
  const projectId = resolvedParams.project;
  
  // Fetch initial tasks
  const initialTasks = projectId ? await getProjectTasks(projectId) : [];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card">
        <div className="flex h-16 items-center px-4 border-b">
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
        <Suspense fallback={<ProjectSkeleton />}>
          <ProjectsList />
        </Suspense>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
          <Search />
          <UserNav />
        </header>
        
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<ProjectSkeleton />}>
            <ProjectBoard 
              projectId={projectId} 
              initialTasks={initialTasks} 
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
