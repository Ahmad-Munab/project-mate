import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

async function getProjects() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }

  try {
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, user.id));

    return userProjects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export default async function ProjectsList() {
  const userProjects = await getProjects();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link href="/projects/new">
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create New Project
          </Button>
        </Link>
      </div>

      {userProjects.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground flex-1 flex items-center justify-center">
          <div>
            <p>No projects found.</p>
            <p className="text-sm mt-1">Create your first project to get started.</p>
          </div>
        </div>
      ) : (
        <div className="p-4 overflow-y-auto">
          <ul className="space-y-2">
            {userProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/dashboard?project=${project.id}`}
                  className="block p-3 rounded-lg hover:bg-sidebar-accent transition-colors"
                >
                  <h3 className="font-medium">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {project.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
