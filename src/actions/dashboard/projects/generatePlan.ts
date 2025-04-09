import { z } from "zod";
import { generateProjectStructure } from "@/lib/ai";

const taskSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

const columnSchema = z.object({
  name: z.string(),
  key: z.string(),
  color: z.string().optional(),
});

// Define the ProjectPlan type first
export type ProjectPlan = {
  name: string;
  description: string;
  columns: {
    name: string;
    key: string;
    color?: string;
  }[];
  tasks: {
    title: string;
    description: string;
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }[];
};

export const generateProjectPlan = async (
  idea: string
): Promise<ProjectPlan> => {
  try {
    // Use the LangChain-based project structure generator
    const result = await generateProjectStructure(
      // Extract a project name from the idea
      idea.split(" ").slice(0, 3).join(" "),
      // Use the full idea as the description
      idea,
      // Default to "web" as the project type
      "web"
    );

    // Validate basic structure
    if (!result.columns || !result.tasks) {
      throw new Error("Response missing required fields");
    }

    // Validate name and description lengths
    const name = result.columns.length > 0 ? result.columns[0].name : idea.substring(0, 60);
    const description = idea.substring(0, 200);

    // Validate columns
    if (result.columns.length < 2) {
      throw new Error(`Not enough columns: ${result.columns.length}`);
    }

    // Ensure BACKLOG column exists
    const hasBacklog = result.columns.some(col => col.key === "BACKLOG");
    if (!hasBacklog) {
      result.columns.push({
        name: "Backlog",
        key: "BACKLOG",
        color: "bg-gray-50"
      });
    }

    // Validate columns
    for (const column of result.columns) {
      const validationResult = columnSchema.safeParse(column);
      if (!validationResult.success) {
        throw new Error(`Invalid column structure: ${JSON.stringify(column)}`);
      }
    }

    // Validate tasks
    if (result.tasks.length < 5) {
      throw new Error(`Not enough tasks: ${result.tasks.length}`);
    }

    // Get all valid column keys
    const validColumnKeys = result.columns.map(col => col.key);

    for (const task of result.tasks) {
      const validationResult = taskSchema.safeParse(task);
      if (!validationResult.success) {
        throw new Error(`Invalid task structure: ${JSON.stringify(task)}`);
      }

      // Ensure task status is a valid column key
      if (!validColumnKeys.includes(task.status)) {
        // Default to BACKLOG if invalid
        task.status = "BACKLOG";
      }
    }

    // Create the final project plan
    const projectPlan: ProjectPlan = {
      name,
      description,
      columns: result.columns,
      tasks: result.tasks
    };

    return projectPlan;
  } catch (error) {
    console.error("AI generation error:", error);
    throw error;
  }
};

