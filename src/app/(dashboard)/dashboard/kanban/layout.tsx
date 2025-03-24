
import type React from "react";
import { Suspense } from "react";
import ProjectsList from "@/components/kanban-board/ProjectsList";
import ProjectSkeleton from "@/components/kanban-board/ProjectSkeleton";
import { UserNav } from "@/components/kanban-board/UserNav";
import { Search } from "@/components/kanban-board/Search";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="p-2 md:hidden absolute left-4 top-3 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-4 h-16 flex items-center border-b">
            <SheetTitle>Projects</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-4rem)] bg-card">
            <Suspense fallback={<ProjectSkeleton />}>
              <ProjectsList />
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-card">
        <div className="flex h-16 items-center px-4 border-b">
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
        <Suspense fallback={<ProjectSkeleton />}>
          <ProjectsList />
        </Suspense>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 md:hidden" /> {/* Spacer for mobile menu button */}
            <Search />
          </div>
          <UserNav />
        </header>

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
