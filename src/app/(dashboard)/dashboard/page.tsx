import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome to your Dashboard</h2>
        <p className="text-muted-foreground mb-6">
          Select a project from the sidebar or create a new project to get
          started.
        </p>
        <div className="flex justify-center">
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Create New Project
          </Link>
        </div>
      </div>
    </div>
  );
}
