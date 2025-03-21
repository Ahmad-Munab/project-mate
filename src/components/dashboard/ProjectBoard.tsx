import { db } from "@/db";
import { tasks, taskStatusEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import TaskCard from "./TaskCard";

async function getProjectTasks(projectId: string) {
  if (!projectId) {
    return [];
  }

  try {
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId)); // Changed from projectId to project_id

    return projectTasks;
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    return [];
  }
}

export default async function ProjectBoard({
  projectId,
}: {
  projectId?: string;
}) {
  // Show a message if no project is selected
  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a project to view tasks</p>
      </div>
    );
  }

  const projectTasks = await getProjectTasks(projectId);
  const columns = Object.values(taskStatusEnum.enumValues);

  return (
    <div className="h-full p-6">
      <div className="flex h-full gap-4">
        {columns.map((status) => (
          <div
            key={status}
            className="flex-1 min-w-[280px] bg-card rounded-lg p-4"
          >
            <h3 className="font-medium mb-4 text-muted-foreground">
              {status.replace(/_/g, " ")}
            </h3>
            <div className="space-y-3">
              {projectTasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
