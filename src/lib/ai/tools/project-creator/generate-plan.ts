/**
 * Project Plan Generator
 * 
 * This module provides functionality to generate a project plan based on a project idea
 * using the AI system.
 */

import { Groq } from "groq-sdk";
import { priorityConfig } from "@/config/dynamic-defaults";

// Define the ProjectPlan type
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
 * Generate a project plan based on a project idea
 * 
 * @param idea - The project idea
 * @returns A project plan with columns and tasks
 */
export async function generateProjectPlan(idea: string): Promise<ProjectPlan> {
  try {
    console.log("Generating project plan for idea:", idea);

    if (!idea) {
      throw new Error("Project idea is required");
    }

    // Initialize Groq API client
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Get available priorities from config
    const availablePriorities = Object.keys(priorityConfig.levels);

    // Create the prompt for the AI
    const prompt = `
    Create a detailed project plan for the following project idea:
    "${idea}"

    Return a JSON object with the following structure:
    {
      "name": "Project Name",
      "description": "A detailed description of the project",
      "columns": [
        {
          "name": "Column Name",
          "key": "COLUMN_KEY",
          "color": "blue" // One of: gray, blue, green, red, yellow, purple
        },
        // More columns...
      ],
      "tasks": [
        {
          "title": "Task Title",
          "description": "Detailed task description",
          "status": "COLUMN_KEY", // Must match one of the column keys
          "priority": "MEDIUM" // One of: ${availablePriorities.join(", ")}
        },
        // More tasks...
      ]
    }

    Guidelines:
    1. Create at least 5-7 columns representing different phases or categories of work
    2. Always include a "Backlog" column with key "BACKLOG"
    3. Create at least 10-15 tasks distributed across the columns
    4. Make sure each task status matches a column key
    5. Column keys should be uppercase with underscores (e.g., "IN_PROGRESS")
    6. Provide detailed and specific task descriptions
    7. Assign appropriate priorities to tasks
    8. Make the project plan realistic and comprehensive

    DO NOT include any explanations or additional text, ONLY the JSON object.
    `;

    // Call Groq API for structured output
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a project planning assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // Parse JSON from response
    let projectPlan: ProjectPlan;
    try {
      projectPlan = JSON.parse(aiResponse);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      throw new Error("Failed to parse AI response");
    }

    // Validate basic structure
    if (!projectPlan.columns || !Array.isArray(projectPlan.columns) || !projectPlan.tasks || !Array.isArray(projectPlan.tasks)) {
      console.error("Missing or invalid structure in AI response");
      throw new Error("AI failed to generate a valid project structure");
    }

    // Ensure BACKLOG column exists
    const hasBacklog = projectPlan.columns.some(col => col.key === "BACKLOG");
    if (!hasBacklog) {
      projectPlan.columns.push({
        name: "Backlog",
        key: "BACKLOG",
        color: "gray"
      });
    }

    // Ensure all tasks have valid statuses
    const validColumnKeys = projectPlan.columns.map(col => col.key);
    for (const task of projectPlan.tasks) {
      if (!validColumnKeys.includes(task.status)) {
        // Default to BACKLOG if invalid
        task.status = "BACKLOG";
      }
    }

    return projectPlan;
  } catch (error) {
    console.error("Failed to generate project plan:", error);
    throw error;
  }
}
