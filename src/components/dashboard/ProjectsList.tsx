import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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

  if (userProjects.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No projects found.</p>
        <Link 
          href="/projects/new" 
          className="text-primary hover:underline mt-2 block"
        >
          Create your first project
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
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
  );
}
