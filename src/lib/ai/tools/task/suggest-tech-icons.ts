/**
 * Suggest Tech Icons Tool
 * This file implements a tool for suggesting technology icons for tasks
 * following the single responsibility principle
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { suggestTechIcons } from "./tech-icon-matcher";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Suggest tech icons for a task
 * @param taskId - The ID of the task
 * @returns The suggested tech icons
 */
export async function suggestTechIconsForTask(taskId: string): Promise<string[]> {
  // Get the task
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`);
  }

  // Suggest tech icons based on task content
  return suggestTechIcons(
    task.title,
    task.description || "",
    3 // Maximum 3 icons
  );
}

/**
 * Apply suggested tech icons to a task
 * @param taskId - The ID of the task
 * @param techIcons - The tech icons to apply
 * @returns The updated task
 */
export async function applyTechIcons(
  taskId: string,
  techIcons: string[]
): Promise<any> {
  // Get the task
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`);
  }

  // Update the task with the tech icons
  const [updatedTask] = await db
    .update(tasks)
    .set({
      tech_icons: JSON.stringify(techIcons),
      tech_icon: techIcons.length > 0 ? techIcons[0] : null, // For backward compatibility
    })
    .where(eq(tasks.id, taskId))
    .returning();

  return updatedTask;
}

/**
 * Create a tool for suggesting tech icons for a task
 * @returns A tool for suggesting tech icons
 */
export function suggestTechIconsTool() {
  return new DynamicStructuredTool({
    name: "suggest_tech_icons",
    description: "Suggest technology icons for a task based on its content. Use this when you want to add relevant tech icons to a task.",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to suggest tech icons for (required)"),
      apply: z.boolean().optional().describe("Whether to apply the suggested icons to the task (optional, default: false)"),
    }),
    func: async ({ taskId, apply = false }) => {
      try {
        console.log(`Suggesting tech icons for task ${taskId}`);

        // Suggest tech icons
        const suggestedIcons = await suggestTechIconsForTask(taskId);

        if (suggestedIcons.length === 0) {
          return JSON.stringify({
            success: true,
            suggestedIcons: [],
            message: "No tech icons could be suggested for this task.",
          });
        }

        // Apply the icons if requested
        if (apply) {
          const updatedTask = await applyTechIcons(taskId, suggestedIcons);

          return JSON.stringify({
            success: true,
            suggestedIcons,
            appliedIcons: suggestedIcons,
            task: updatedTask,
            message: `Applied ${suggestedIcons.length} tech icons to the task.`,
          });
        }

        return JSON.stringify({
          success: true,
          suggestedIcons,
          message: `Found ${suggestedIcons.length} tech icons that match this task.`,
        });
      } catch (error) {
        console.error("Error in suggest_tech_icons tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error suggesting tech icons",
        });
      }
    },
  });
}

/**
 * Create a tool for applying tech icons to a task
 * @returns A tool for applying tech icons
 */
export function applyTechIconsTool() {
  return new DynamicStructuredTool({
    name: "apply_tech_icons",
    description: "Apply technology icons to a task. Use this when you want to set specific tech icons for a task.",
    schema: z.object({
      taskId: z.string().describe("The ID of the task to apply tech icons to (required)"),
      techIcons: z.array(z.string()).describe("The tech icons to apply (required, array of icon slugs)"),
    }),
    func: async ({ taskId, techIcons }) => {
      try {
        console.log(`Applying tech icons to task ${taskId}:`, techIcons);

        if (!techIcons || techIcons.length === 0) {
          return JSON.stringify({
            success: false,
            error: "No tech icons provided",
          });
        }

        // Apply the icons
        const updatedTask = await applyTechIcons(taskId, techIcons);

        return JSON.stringify({
          success: true,
          appliedIcons: techIcons,
          task: updatedTask,
          message: `Applied ${techIcons.length} tech icons to the task.`,
        });
      } catch (error) {
        console.error("Error in apply_tech_icons tool:", error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error applying tech icons",
        });
      }
    },
  });
}
