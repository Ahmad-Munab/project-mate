/**
 * Project Creator
 * This file contains functions for creating projects using AI
 */

import { ChatGroq } from "@langchain/groq";
import { storeEnhancedMessage } from "../memory/enhanced";

/**
 * Configuration for the project creator
 */
const projectCreatorConfig = {
  model: "llama3-70b-8192",
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Generate a project plan based on a description
 * @param projectDescription - The description of the project
 * @returns The generated project plan
 */
export async function generateProjectPlan(projectDescription: string) {
  try {
    // Create a model
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: projectCreatorConfig.model,
      temperature: projectCreatorConfig.temperature,
      maxTokens: projectCreatorConfig.maxTokens,
    });

    // Create the prompt
    const prompt = `
You are an expert project planner. You need to create a detailed project plan based on the following description:

${projectDescription}

Generate a project plan with the following:
1. A concise project name (3-5 words)
2. A brief project description (2-3 sentences)
3. At least 4-6 different columns (task statuses) for organizing tasks (e.g., Backlog, Planning, Frontend, Backend, Testing, Done)
4. A list of 10-15 tasks distributed across these columns (not all in Backlog)

Format your response as JSON with the following structure:
{
  "name": "Project Name",
  "description": "Brief project description (2-3 sentences)",
  "columns": [
    {
      "name": "Column name",
      "key": "COLUMN_KEY", // Uppercase with underscores, e.g., BACKLOG, IN_PROGRESS, DONE
      "color": "blue" // or green, red, yellow, purple, etc.
    }
  ],
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "status": "COLUMN_KEY", // Must match the key of one of the columns above
      "priority": "HIGH" // or MEDIUM, LOW, URGENT
    }
  ]
}

Make sure to create appropriate columns beyond just "Backlog" and organize tasks into these columns.
Create at least 3-5 columns and 10-15 tasks.
Be specific and technical in your task descriptions.

IMPORTANT RULES:
1. You MUST include both "name" and "description" fields in your JSON response
2. You MUST create at least 4-6 different columns (not just Backlog and Done)
3. Each column MUST have a unique "key" field that is UPPERCASE with underscores (e.g., BACKLOG, FRONTEND, BACKEND, TESTING, DONE)
4. Each task's "status" field MUST match the "key" of one of the columns (not the name)
5. Tasks MUST be distributed across different columns (not all in Backlog)
6. Always include a "BACKLOG" column
7. Valid colors are: blue, green, red, yellow, purple, gray, pink, orange
    `.trim();

    // Call the model
    const response = await model.invoke(prompt);

    // Parse the response
    const content = response.content as string;
    console.log("Raw AI response:", content.substring(0, 200) + "...");

    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*?}/);

    let parsedResult;
    if (jsonMatch) {
      const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
      try {
        parsedResult = JSON.parse(jsonString);
      } catch (error) {
        console.error("Failed to parse JSON from match:", error);
        console.error("JSON string:", jsonString.substring(0, 200) + "...");
        return null;
      }
    } else {
      try {
        parsedResult = JSON.parse(content);
      } catch (error) {
        console.error("Failed to parse project plan:", error);
        console.error("Content:", content.substring(0, 200) + "...");
        return null;
      }
    }

    // Validate the result has the required structure
    if (!parsedResult || !parsedResult.columns || !parsedResult.tasks) {
      console.error("Invalid project plan structure:", parsedResult);
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
      const existingKeys = parsedResult.columns.map(col => col.key);

      // Add missing columns
      for (const col of defaultColumns) {
        if (!existingKeys.includes(col.key)) {
          parsedResult.columns.push(col);
        }
      }
    }

    // Ensure tasks are distributed across columns
    const columnKeys = parsedResult.columns.map(col => col.key);
    const tasksPerColumn: Record<string, number> = {};

    // Initialize task counts
    columnKeys.forEach(key => {
      tasksPerColumn[key] = 0;
    });

    // Count tasks per column
    parsedResult.tasks.forEach(task => {
      if (tasksPerColumn[task.status] !== undefined) {
        tasksPerColumn[task.status]++;
      } else {
        // If task has invalid status, set it to BACKLOG
        task.status = "BACKLOG";
        tasksPerColumn["BACKLOG"]++;
      }
    });

    // Redistribute tasks if they're all in one column
    const totalTasks = parsedResult.tasks.length;
    const columnsWithTasks = Object.values(tasksPerColumn).filter(count => count > 0).length;

    if (columnsWithTasks <= 1 && totalTasks > 3) {
      console.log("Tasks not distributed, redistributing...");

      // Distribute tasks across columns
      parsedResult.tasks.forEach((task, index) => {
        // Simple distribution algorithm
        const columnIndex = index % columnKeys.length;
        task.status = columnKeys[columnIndex];
      });
    }

    // Ensure all columns have keys
    parsedResult.columns = parsedResult.columns.map(column => {
      if (!column.key) {
        // Generate a key from the name if missing
        column.key = column.name.toUpperCase().replace(/\s+/g, '_');
      }
      return column;
    });

    return parsedResult;
  } catch (error) {
    console.error("Failed to generate project plan:", error);
    return null;
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

    // Create the prompt
    const prompt = `
Generate a brief but detailed project description for a project titled "${projectTitle}".
The description should be 2-3 sentences long and explain what the project is about.
Focus on technical aspects and be specific.
    `.trim();

    // Call the model
    const response = await model.invoke(prompt);

    return response.content as string;
  } catch (error) {
    console.error("Failed to generate project description:", error);
    return `A project called "${projectTitle}"`;
  }
}
