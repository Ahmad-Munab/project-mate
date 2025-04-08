'use server'

import { createClient } from "@/utils/supabase/server";
import { createTask, updateProjectDescription, getProjectInfo } from "@/lib/ai/tools";
import { storeEnhancedMessage, type AIMessage } from "@/lib/ai/enhanced-memory";
import { runProjectAgent } from "@/lib/ai/agent";
import { z } from "zod";
import { Groq } from "groq-sdk";



// Schema for task creation
const taskSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(3).max(500),
  status: z.string().default("BACKLOG"),
  priority: z.string().default("MEDIUM"),
});

// Action to create a task via AI
export async function createTaskViaAI(
  projectId: string,
  taskDescription: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Parse the task description to extract task details
    const taskPrompt = `
    Based on this description: "${taskDescription}", create a well-structured task for the project "${projectInfo.project.name}".

    Return ONLY a JSON object with the following structure:
    {
      "title": "A clear, concise title",
      "description": "A detailed description of what needs to be done",
      "status": "BACKLOG",
      "priority": "HIGH"
    }

    The status must be one of: BACKLOG, TODO, IN_PROGRESS, DONE
    The priority must be one of: LOW, MEDIUM, HIGH, URGENT

    DO NOT include any explanations or additional text, ONLY the JSON object.
    `;

    // Call Groq API directly for structured output
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task creation assistant that outputs only valid JSON." },
        { role: "user", content: taskPrompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return { error: "No response from AI" };
    }

    // Parse JSON from response
    let taskData;
    try {
      taskData = JSON.parse(aiResponse);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return { error: "Failed to parse AI response" };
    }

    // Create the task
    const task = await createTask(
      projectId,
      taskData.title,
      taskData.description,
      taskData.status || "BACKLOG",
      taskData.priority || "MEDIUM"
    );

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I've created a new task:

Title: ${task.title}
Description: ${task.description}
Status: ${task.status}
Priority: ${task.priority}`,
        timestamp: new Date(),
      },
      task.id
    );

    // Return success with task details
    return {
      success: true,
      task,
      message: `I've created a new task:

Title: ${task.title}
Description: ${task.description}
Status: ${task.status}
Priority: ${task.priority}`
    };
  } catch (error) {
    console.error("Failed to create task via AI:", error);
    return { error: "Failed to create task" };
  }
}

// Action to update project description via AI
export async function updateProjectDescriptionViaAI(
  projectId: string,
  newDescription: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Run the agent with a specific project description update prompt
    const response = await runProjectAgent(
      projectId,
      `The project "${projectInfo.project.name}" needs its description updated to: ${newDescription}. Please update it and confirm the change.`
    );

    return { success: true, message: response };
  } catch (error) {
    console.error("Failed to update project description:", error);
    return { error: "Failed to update project description" };
  }
}

// Action to perform any AI action
export async function performAIAction(
  projectId: string,
  actionDescription: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Run the agent with the action description and project context
    const response = await runProjectAgent(
      projectId,
      `For the project "${projectInfo.project.name}", please perform the following action: ${actionDescription}. Be specific to this project and its current state.`
    );

    return { success: true, message: response };
  } catch (error) {
    console.error("Failed to perform AI action:", error);
    return { error: "Failed to perform AI action" };
  }
}
