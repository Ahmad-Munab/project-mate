/**
 * Project Creator
 * This file contains functions for creating projects using AI
 */

import { ChatGroq } from "@langchain/groq";
import { storeEnhancedMessage } from "../memory/enhanced";

/**
 * Retry AI generation with a minimal prompt when initial generation fails
 * @param projectDescription - The description of the project
 * @param model - The ChatGroq model instance
 * @returns A project plan or null if generation fails
 */
async function retryAIGeneration(projectDescription: string, model: ChatGroq) {
  try {
    console.log("Retrying AI generation with minimal prompt...");

    // Create a more structured prompt for retry that ensures multiple columns and tasks
    const retryPrompt = `JSON project plan for "${projectDescription}":
{
  "name": "${projectDescription.split(' ').slice(0, 3).join(' ')}",
  "description": "${projectDescription}",
  "columns": [
    {"name": "Backlog", "key": "BACKLOG", "color": "bg-gray-50 dark:bg-gray-900"},
    {"name": "Planning", "key": "PLANNING", "color": "bg-blue-50 dark:bg-blue-900/20"},
    {"name": "Frontend", "key": "FRONTEND", "color": "bg-indigo-50 dark:bg-indigo-900/20"},
    {"name": "Backend", "key": "BACKEND", "color": "bg-green-50 dark:bg-green-900/20"},
    {"name": "Testing", "key": "TESTING", "color": "bg-purple-50 dark:bg-purple-900/20"},
    {"name": "Done", "key": "DONE", "color": "bg-emerald-50 dark:bg-emerald-900/20"}
  ],
  "tasks": [
    {"title": "Initial project setup", "description": "Set up project structure and dependencies", "status": "BACKLOG", "priority": "HIGH"},
    {"title": "Create database models", "description": "Design and implement database schema", "status": "PLANNING", "priority": "HIGH"},
    {"title": "Implement user authentication", "description": "Set up user login and registration", "status": "BACKEND", "priority": "HIGH"},
    {"title": "Design UI components", "description": "Create reusable UI components", "status": "FRONTEND", "priority": "MEDIUM"},
    {"title": "Write unit tests", "description": "Create tests for core functionality", "status": "TESTING", "priority": "MEDIUM"},
    {"title": "Project documentation", "description": "Create comprehensive documentation", "status": "DONE", "priority": "LOW"}
  ]
}`;

    // Call the model with the minimal prompt
    const response = await model.invoke(retryPrompt);
    const content = response.content as string;

    // Try to extract JSON
    const jsonMatch = content.match(/{[\s\S]*?}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        if (result && result.name && result.columns && result.tasks) {
          return result;
        }
      } catch (e) {
        console.error("Failed to parse retry response:", e);
      }
    }

    return null;
  } catch (error) {
    console.error("Retry AI generation failed:", error);
    return null;
  }
}

/**
 * Configuration for the project creator
 */
const projectCreatorConfig = {
  model: "llama3-70b-8192",
  temperature: 0.7,
  maxTokens: 1000, // Reduced token limit to save on usage
};

/**
 * Generate a project plan based on a description
 * @param projectDescription - The description of the project
 * @returns The generated project plan
 */
export async function generateProjectPlan(projectDescription: string) {
  try {
    // Check if API key is available
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not defined in environment variables");
      throw new Error("API key configuration error");
    }

    // Create a model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: projectCreatorConfig.model,
      temperature: projectCreatorConfig.temperature,
      maxTokens: projectCreatorConfig.maxTokens,
    });

    // Create a comprehensive prompt to generate technical tasks and columns
    const prompt = `
Create a detailed technical project plan for: "${projectDescription}"

Return JSON with:
{
  "name": "Short name",
  "description": "Brief description",
  "columns": [
    {"name": "Column name", "key": "COLUMN_KEY", "color": "blue"}
  ],
  "tasks": [
    {"title": "Task title", "description": "Technical description with implementation details", "status": "COLUMN_KEY", "priority": "HIGH"}
  ]
}

Rules:
- Include 5-6 columns (MUST include BACKLOG, PLANNING, FRONTEND, BACKEND, TESTING, DONE)
- Create 10-15 specific technical tasks distributed across all columns
- Tasks should be detailed and technical, not generic
- Include frontend tasks (UI components, state management, etc.)
- Include backend tasks (API endpoints, database models, etc.)
- Include testing tasks (unit tests, integration tests, etc.)
- Keys must be UPPERCASE with underscores for spaces
- Task status must match column keys exactly
- Every column must have at least 1-2 tasks
- BACKLOG column is required and should have 2-3 tasks
`.trim();

    // Call the model
    const response = await model.invoke(prompt);

    // Parse the response
    const content = response.content as string;
    console.log("Raw AI response:", content.substring(0, 200) + "...");

    // Improved JSON extraction with multiple regex patterns
    let jsonString = "";
    let parsedResult = null;

    // Try different regex patterns to extract JSON
    const patterns = [
      /```json\n([\s\S]*?)\n```/, // ```json\n...\n```
      /```\n([\s\S]*?)\n```/,     // ```\n...\n```
      /```([\s\S]*?)```/,       // ```...```
      /{[\s\S]*?"tasks":[\s\S]*?}/  // Raw JSON with tasks field
    ];

    // Try each pattern until we find a match
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        // If the pattern has a capture group, use that, otherwise use the full match
        jsonString = match[1] ? match[1] : match[0];
        jsonString = jsonString.replace(/```json\n|```\n|```/g, '').trim();

        try {
          parsedResult = JSON.parse(jsonString);
          if (parsedResult && typeof parsedResult === 'object') {
            break; // Successfully parsed, exit the loop
          }
        } catch (e) {
          console.log(`Failed to parse with pattern ${pattern}:`, e);
          // Continue to the next pattern
        }
      }
    }

    // If no pattern worked, try to find and extract just the JSON object
    if (!parsedResult) {
      try {
        // Look for a JSON object with the expected structure
        const jsonObjectMatch = content.match(/{[\s\S]*?"name"[\s\S]*?"description"[\s\S]*?"columns"[\s\S]*?"tasks"[\s\S]*?}/);
        if (jsonObjectMatch) {
          jsonString = jsonObjectMatch[0];
          parsedResult = JSON.parse(jsonString);
        }
      } catch (error) {
        console.error("Failed to extract JSON object:", error);
      }
    }

    // Last resort: try to parse the entire content
    if (!parsedResult) {
      try {
        parsedResult = JSON.parse(content);
      } catch (error) {
        console.error("Failed to parse entire content as JSON:", error);
        console.error("Content sample:", content.substring(0, 300));
      }
    }

    // If we still don't have a valid result, retry with a simplified prompt
    if (!parsedResult) {
      console.warn("Initial AI generation failed, retrying with simplified prompt");
      parsedResult = await retryAIGeneration(projectDescription, model);
    }

    // Validate the result has the required structure
    if (!parsedResult || !parsedResult.columns || !parsedResult.tasks) {
      console.error("AI generation failed completely");
      return null;
    }

    // Handle the case where the AI returns 'overview' instead of 'name' and 'description'
    if (parsedResult.overview && !parsedResult.name) {
      // Extract a name from the overview (first 5-7 words)
      const words = parsedResult.overview.split(' ');
      parsedResult.name = words.slice(0, Math.min(7, words.length)).join(' ');

      // Use the overview as the description
      if (!parsedResult.description) {
        parsedResult.description = parsedResult.overview;
      }

      console.log("Generated name from overview:", parsedResult.name);
    }

    // Ensure we have at least 4 columns
    if (parsedResult.columns.length < 4) {
      console.log("Not enough columns, adding default columns");

      // Default columns to add if missing
      const defaultColumns = [
        { name: "Backlog", key: "BACKLOG", color: "bg-gray-50 dark:bg-gray-900" },
        { name: "Planning", key: "PLANNING", color: "bg-blue-50 dark:bg-blue-900/20" },
        { name: "Frontend", key: "FRONTEND", color: "bg-indigo-50 dark:bg-indigo-900/20" },
        { name: "Backend", key: "BACKEND", color: "bg-green-50 dark:bg-green-900/20" },
        { name: "Testing", key: "TESTING", color: "bg-purple-50 dark:bg-purple-900/20" },
        { name: "Done", key: "DONE", color: "bg-emerald-50 dark:bg-emerald-900/20" },
      ];

      // Get existing column keys
      const existingKeys = parsedResult.columns.map((col: {key: string}) => col.key);

      // Add missing columns
      for (const col of defaultColumns) {
        if (!existingKeys.includes(col.key)) {
          parsedResult.columns.push(col);
        }
      }
    }

    // Define types for columns and tasks
    type Column = { name: string; key: string; color?: string };
    type Task = { title: string; description: string; status: string; priority: string };

    // Ensure tasks are distributed across columns
    const columnKeys = parsedResult.columns.map((col: Column) => col.key);
    const tasksPerColumn: Record<string, number> = {};

    // Initialize task counts
    columnKeys.forEach((key: string) => {
      tasksPerColumn[key] = 0;
    });

    // Count tasks per column
    parsedResult.tasks.forEach((task: Task) => {
      if (tasksPerColumn[task.status] !== undefined) {
        tasksPerColumn[task.status]++;
      } else {
        // If task has invalid status, set it to BACKLOG
        task.status = "BACKLOG";
        tasksPerColumn["BACKLOG"] = (tasksPerColumn["BACKLOG"] || 0) + 1;
      }
    });

    // Redistribute tasks if they're all in one column
    const totalTasks = parsedResult.tasks.length;
    const columnsWithTasks = Object.values(tasksPerColumn).filter(count => count > 0).length;

    if (columnsWithTasks <= 1 && totalTasks > 3) {
      console.log("Tasks not distributed, redistributing...");

      // Distribute tasks across columns
      parsedResult.tasks.forEach((task: Task, index: number) => {
        // Simple distribution algorithm
        const columnIndex = index % columnKeys.length;
        task.status = columnKeys[columnIndex];
      });
    }

    // Ensure all columns have keys
    parsedResult.columns = parsedResult.columns.map((column: Column) => {
      if (!column.key) {
        // Generate a key from the name if missing
        column.key = column.name.toUpperCase().replace(/\s+/g, '_');
      }
      return column;
    });

    return parsedResult;
  } catch (error) {
    console.error("Failed to generate project plan:", error);

    // Check if it's a rate limit error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
      throw new Error("AI service rate limit exceeded. Please try again later.");
    }

    // Return a fallback plan instead of null
    return {
      name: "New Project",
      description: projectDescription.substring(0, 200),
      columns: [
        { name: "Backlog", key: "BACKLOG", color: "bg-gray-50 dark:bg-gray-900" },
        { name: "In Progress", key: "IN_PROGRESS", color: "bg-blue-50 dark:bg-blue-900/20" },
        { name: "Done", key: "DONE", color: "bg-emerald-50 dark:bg-emerald-900/20" }
      ],
      tasks: [
        { title: "Initial project setup", description: "Set up the project structure and dependencies", status: "BACKLOG", priority: "HIGH" },
        { title: "Create documentation", description: "Document the project requirements and architecture", status: "BACKLOG", priority: "MEDIUM" },
        { title: "Implement core features", description: "Develop the main functionality of the project", status: "BACKLOG", priority: "HIGH" }
      ]
    };
  }
}

/**
 * Generate project tasks based on a description
 * @param projectId - The ID of the project
 * @param projectDescription - The description of the project
 * @returns The generated tasks
 */
export async function generateProjectTasks(projectId: string, projectDescription: string) {
  try {
    // Generate the project plan
    const projectPlan = await generateProjectPlan(projectDescription);

    if (!projectPlan) {
      return null;
    }

    // Store the project plan as a message
    await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: `Generated project plan: ${JSON.stringify(projectPlan)}`,
        timestamp: new Date(),
      }
    );

    return projectPlan;
  } catch (error) {
    console.error("Failed to generate project tasks:", error);
    return null;
  }
}

/**
 * Generate a project description based on a title
 * @param projectTitle - The title of the project
 * @returns The generated project description
 */
export async function generateProjectDescription(projectTitle: string) {
  try {
    // Create a model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: projectCreatorConfig.model,
      temperature: projectCreatorConfig.temperature,
      maxTokens: 200,
    });

    // Create a concise prompt
    const prompt = `Write a 1-2 sentence technical description for: "${projectTitle}"`.trim();

    // Call the model
    const response = await model.invoke(prompt);

    return response.content as string;
  } catch (error) {
    console.error("Failed to generate project description:", error);
    return `A project called "${projectTitle}"`;
  }
}
