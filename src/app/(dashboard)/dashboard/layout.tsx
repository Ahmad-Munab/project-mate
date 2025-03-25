import type React from "react";
import { Suspense } from "react";
import ProjectsList from "@/components/dashboard/ProjectsList";
import ProjectSkeleton from "@/components/dashboard/ProjectSkeleton";
import { UserNav } from "@/components/dashboard/UserNav";
import { Search } from "@/components/dashboard/Search";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
