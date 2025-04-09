/**
 * LangChain-based project creator
 * Uses LangChain tools to create a new project with technical tasks and columns
 */

import { Groq } from "groq-sdk";
import { ChatGroq } from "@langchain/groq";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
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
 * Generate a project plan using LangChain
 * @param idea - The project idea
 * @returns A project plan with name, description, columns, and tasks
 */
export async function generateProjectPlan(idea: string): Promise<ProjectPlan> {
  try {
    // Initialize the LLM
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama3-70b-8192",
      temperature: 0.4,
    });

    // Create tools for the agent
    const tools = [
      new DynamicStructuredTool({
        name: "create_project_plan",
        description: "Create a detailed technical project plan with columns and tasks",
        schema: z.object({
          name: z.string().describe("Project name (max 60 chars)"),
          description: z.string().describe("Project description (max 200 chars)"),
          columns: z.array(
            z.object({
              name: z.string().describe("Column name"),
              key: z.string().describe("Column key in uppercase (e.g., TODO)"),
              color: z.string().optional().describe("Optional color in hex or tailwind format"),
            })
          ).describe("Columns/statuses for the project (3-4 columns including BACKLOG)"),
          tasks: z.array(
            z.object({
              title: z.string().describe("Task title"),
              description: z.string().describe("Detailed technical task description with implementation guidance"),
              status: z.string().describe("Column key that this task belongs to"),
              priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).describe("Task priority"),
            })
          ).describe("Technical tasks for the project (8-12 tasks)"),
        }),
        func: async ({ name, description, columns, tasks }) => {
          // Validate the plan
          if (name.length > 60) {
            throw new Error("Project name too long");
          }
          if (description.length > 200) {
            throw new Error("Project description too long");
          }
          if (columns.length < 2) {
            throw new Error("Not enough columns");
          }
          if (tasks.length < 5) {
            throw new Error("Not enough tasks");
          }

          // Ensure BACKLOG column exists
          const hasBacklog = columns.some(col => col.key === "BACKLOG");
          if (!hasBacklog) {
            columns.push({
              name: "Backlog",
              key: "BACKLOG",
              color: "#E5E7EB"
            });
          }

          // Get all valid column keys
          const validColumnKeys = columns.map(col => col.key);

          // Ensure all tasks have valid statuses
          for (const task of tasks) {
            if (!validColumnKeys.includes(task.status)) {
              // Default to BACKLOG if invalid
              task.status = "BACKLOG";
            }
          }

          return {
            name,
            description,
            columns,
            tasks
          };
        },
      }),
    ];

    // Create the agent prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are a SUPERINTELLIGENT technical project planner for software development projects. 
      Your task is to create a detailed technical project plan based on the user's idea.
      
      GUIDELINES:
      1. Create 3-4 columns (task statuses) including at least "BACKLOG" (which is required), "TODO", "IN_PROGRESS", and "DONE"
      2. Include 8-12 highly technical and specific tasks that would help a developer implement this project
      3. Tasks should be technical in nature, like "Create responsive navbar component", "Setup authentication middleware", "Implement user dashboard UI", etc.
      4. DO NOT include business tasks like "Market research", "Hire developers", etc.
      5. Each task should have a detailed technical description that provides implementation guidance
      6. Distribute tasks across different columns/statuses (not all in BACKLOG)
      7. Each task priority must be one of: "LOW", "MEDIUM", "HIGH", "URGENT"
      
      You MUST use the create_project_plan tool to create the project plan.`],
      ["human", "Create a project plan for this idea: {idea}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Create the agent
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt,
    });

    // Create the executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    });

    // Execute the agent
    const result = await agentExecutor.invoke({
      idea,
    });

    // Extract the project plan from the result
    const projectPlan = result.output as unknown as ProjectPlan;

    // Return the project plan
    return projectPlan;
  } catch (error) {
    console.error("Failed to generate project plan:", error);
    throw error;
  }
}
