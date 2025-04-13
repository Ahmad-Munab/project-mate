/**
 * LangChain Project Creator
 * This file implements a proper LangChain project creator
 */

import { ChatGroq } from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

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
 * Create a LangChain model
 * @param temperature - The temperature to use
 * @returns A LangChain model
 */
function createModel(temperature: number = 0.4) {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "llama3-70b-8192",
    temperature,
  });
}

/**
 * Generate a project plan using LangChain
 * @param idea - The project idea
 * @returns A project plan with name, description, columns, and tasks
 */
export async function generateProjectPlan(idea: string): Promise<ProjectPlan> {
  try {
    if (!idea) {
      throw new Error("Project idea is required");
    }

    console.log("Generating project plan for idea:", idea);

    // Define the output schema
    const projectPlanSchema = z.object({
      name: z.string().describe("The name of the project (max 60 chars)"),
      description: z.string().describe("A description of the project (max 200 chars)"),
      columns: z.array(
        z.object({
          name: z.string().describe("The name of the column"),
          key: z.string().describe("The key of the column (uppercase with underscores)"),
          color: z.string().optional().describe("The color of the column (e.g., 'blue', 'green', 'red')"),
        })
      ).describe("The columns (task statuses) for the project"),
      tasks: z.array(
        z.object({
          title: z.string().describe("The title of the task"),
          description: z.string().describe("The description of the task"),
          status: z.string().describe("The key of the column this task belongs to"),
          priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).describe("The priority of the task"),
        })
      ).describe("The tasks for the project"),
    });

    // Create the output parser
    const outputParser = StructuredOutputParser.fromZodSchema(projectPlanSchema);

    // Create the model
    const model = createModel();

    // Create the prompt template
    const systemPrompt = `You are a SUPERINTELLIGENT technical project planner for software development projects.
    Create a detailed technical project plan for this idea: ${idea}

    Rules:
    - Create 3-4 columns (task statuses) including at least "BACKLOG" (which is required), "TODO", "IN_PROGRESS", and "DONE"
    - Include 8-12 highly technical and specific tasks that would help a developer implement this project
    - Tasks should be technical in nature, like "Create responsive navbar component", "Setup authentication middleware", "Implement user dashboard UI", etc.
    - DO NOT include business tasks like "Market research", "Hire developers", etc.
    - Each task should have a detailed technical description that provides implementation guidance
    - Distribute tasks across different columns/statuses (not all in BACKLOG)
    - Each task priority must be one of: "LOW", "MEDIUM", "HIGH", "URGENT"

    ${outputParser.getFormatInstructions()}`;

    // Run the model directly
    const response = await model.invoke(systemPrompt);

    // Parse the response
    const result = await outputParser.parse(response.content);

    // Ensure task distribution
    const enhancedPlan = ensureTaskDistribution(result);

    return enhancedPlan;
  } catch (error) {
    console.error("Failed to generate project plan:", error);
    throw error;
  }
}

// Function removed to avoid duplication

/**
 * Ensures tasks are intelligently distributed across all columns
 * @param plan - The project plan
 * @returns The enhanced project plan
 */
function ensureTaskDistribution(plan: ProjectPlan): ProjectPlan {
  // Count tasks per column
  const taskCountByColumn: Record<string, number> = {};

  // Initialize counts to 0
  plan.columns.forEach(col => {
    taskCountByColumn[col.key] = 0;
  });

  // Count tasks in each column
  plan.tasks.forEach(task => {
    if (taskCountByColumn[task.status] !== undefined) {
      taskCountByColumn[task.status]++;
    }
  });

  // Find columns with no tasks or very few tasks (less than 2)
  const underutilizedColumns = plan.columns.filter(col => taskCountByColumn[col.key] < 2);

  // If there are underutilized columns, redistribute tasks intelligently
  if (underutilizedColumns.length > 0) {
    console.log(`Found ${underutilizedColumns.length} underutilized columns. Intelligently redistributing...`);

    // Find columns with the most tasks
    const columnsByTaskCount = [...plan.columns]
      .filter(col => taskCountByColumn[col.key] > 3) // Only consider columns with more than 3 tasks
      .sort((a, b) => taskCountByColumn[b.key] - taskCountByColumn[a.key]);

    // For each underutilized column, move appropriate tasks from columns with many tasks
    underutilizedColumns.forEach(targetCol => {
      // How many tasks we need to add to this column
      const tasksNeeded = 2 - taskCountByColumn[targetCol.key];
      if (tasksNeeded <= 0) return;

      // Find a column with many tasks
      const sourceCol = columnsByTaskCount.find(col => taskCountByColumn[col.key] > 3);
      if (!sourceCol) return; // No more source columns with many tasks

      // Find tasks in the source column
      const tasksInSourceCol = plan.tasks.filter(task => task.status === sourceCol.key);

      // Find tasks that would be appropriate for the target column based on keywords
      const targetColKeywords = getColumnKeywords(targetCol.key);
      const suitableTasks = tasksInSourceCol
        .map(task => ({
          task,
          relevanceScore: calculateRelevance(task, targetColKeywords)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, tasksNeeded)
        .map(item => item.task);

      // Move suitable tasks to the target column
      suitableTasks.forEach(taskToMove => {
        taskToMove.status = targetCol.key;
        console.log(`Moved task "${taskToMove.title}" from ${sourceCol.key} to ${targetCol.key} (relevance score: high)`);

        // Update task counts
        taskCountByColumn[sourceCol.key]--;
        taskCountByColumn[targetCol.key]++;
      });
    });
  }

  return plan;
}

/**
 * Get keywords for a column based on its key
 * @param columnKey - The column key
 * @returns An array of keywords
 */
function getColumnKeywords(columnKey: string): string[] {
  const keywordMap: Record<string, string[]> = {
    BACKLOG: ["idea", "concept", "future", "planned", "backlog", "upcoming"],
    TODO: ["todo", "next", "planned", "ready", "upcoming", "start"],
    IN_PROGRESS: ["progress", "working", "ongoing", "current", "active", "developing"],
    DONE: ["complete", "finished", "done", "ready", "implemented", "tested"],
    FRONTEND: ["ui", "interface", "component", "react", "vue", "angular", "css", "html", "frontend", "client"],
    BACKEND: ["server", "api", "database", "endpoint", "service", "controller", "backend", "node", "express"],
    API: ["endpoint", "rest", "graphql", "service", "request", "response", "api", "interface"],
    DATABASE: ["data", "model", "schema", "migration", "query", "database", "sql", "nosql", "mongodb", "postgres"],
    TESTING: ["test", "unit", "integration", "e2e", "coverage", "jest", "cypress", "testing", "qa"],
    DEVOPS: ["deploy", "ci", "cd", "pipeline", "docker", "kubernetes", "aws", "cloud", "devops", "infrastructure"],
    DOCUMENTATION: ["docs", "readme", "wiki", "document", "comment", "explanation", "documentation"],
    DESIGN: ["ui", "ux", "mockup", "wireframe", "prototype", "figma", "sketch", "design"],
    RESEARCH: ["research", "investigate", "explore", "analyze", "study", "evaluate"],
    BUGS: ["bug", "fix", "issue", "error", "problem", "defect", "crash"],
    FEATURES: ["feature", "enhancement", "improvement", "new", "add", "implement"],
    REFACTORING: ["refactor", "clean", "improve", "optimize", "restructure", "rewrite"],
    SECURITY: ["security", "auth", "authentication", "authorization", "vulnerability", "protect"],
    PERFORMANCE: ["performance", "optimize", "speed", "efficiency", "fast", "slow", "bottleneck"],
  };

  // Return keywords for the column key, or empty array if not found
  return keywordMap[columnKey] || [];
}

/**
 * Calculate the relevance of a task to a set of keywords
 * @param task - The task
 * @param keywords - The keywords
 * @returns A relevance score (0-1)
 */
function calculateRelevance(
  task: { title: string; description: string; status: string; priority: string },
  keywords: string[]
): number {
  if (keywords.length === 0) return 0;

  // Combine title and description for keyword matching
  const taskText = `${task.title} ${task.description}`.toLowerCase();

  // Count how many keywords are found in the task text
  const matchedKeywords = keywords.filter(keyword => taskText.includes(keyword.toLowerCase()));

  // Calculate relevance score (0-1)
  return matchedKeywords.length / keywords.length;
}

/**
 * Create a project structure with a new name to avoid conflicts
 * @param projectName - The name of the project
 * @param projectDescription - The description of the project
 * @param projectType - The type of the project
 * @returns A project plan
 */
export async function createNewProjectStructure(
  projectName: string,
  projectDescription: string,
  projectType: string
): Promise<ProjectPlan> {
  try {
    // Validate inputs
    if (!projectName && !projectDescription) {
      throw new Error("Project name or description is required");
    }

    // Combine the project description and type to create a more detailed idea
    const idea = `${projectDescription || projectName} (${projectType} project)`;
    console.log("Creating new project structure for idea:", idea);

    // Generate the project plan using the LangChain implementation
    return await generateProjectPlan(idea);
  } catch (error) {
    console.error("Failed to generate project structure:", error);
    throw error;
  }
}