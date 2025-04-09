/**
 * LangChain-based project creator
 * Uses LangChain tools to create a new project with technical tasks and columns
 */

import { generateProjectPlan as generatePlan } from "./langchain-tools/project-creator-functions";

// Define the project plan schema
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

/**
 * Generate a project plan using LangChain
 * @param idea - The project idea
 * @returns A project plan with name, description, columns, and tasks
 */
export async function generateProjectStructure(
  projectName: string,
  projectDescription: string,
  projectType: string
): Promise<ProjectPlan> {
  try {
    // Generate the project plan using the LangChain implementation
    return await generatePlan(projectDescription || projectName);
  } catch (error) {
    console.error("Failed to generate project structure:", error);
    throw error;
  }
}

/**
 * Generate a project plan using LangChain
 * @param idea - The project idea
 * @returns A project plan with name, description, columns, and tasks
 */
export async function generateProjectPlan(idea: string): Promise<ProjectPlan> {
  try {
    // Generate the project plan using the LangChain implementation
    return await generatePlan(idea);
  } catch (error) {
    console.error("Failed to generate project plan:", error);
    throw error;
  }
}
