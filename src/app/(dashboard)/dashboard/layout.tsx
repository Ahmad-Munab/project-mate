import type React from "react";
import { Suspense } from "react";
import ProjectSkeleton from "@/components/kanban/ProjectSkeleton";
import UserNav from "@/components/shared/UserNav";
import Sidebar from "@/components/shared/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card">
        <Suspense fallback={<ProjectSkeleton />}>
          <Sidebar />
        </Suspense>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-card px-6 flex items-center">
          <UserNav />
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
