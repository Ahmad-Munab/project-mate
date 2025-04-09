import { Groq } from "groq-sdk";
import { getProjectInfo } from "./project-tools";

// Initialize shared Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

/**
 * Generates task suggestions for a project
 * @param projectId - The ID of the project
 * @param count - Number of tasks to suggest (default: 3)
 * @param context - Additional context for task generation
 * @returns An array of suggested tasks
 */
export async function generateTaskSuggestions(
  projectId: string,
  count: number = 3,
  context: string = ""
) {
  try {
    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Create the prompt
    const prompt = `
    Generate ${count} task suggestions for the project "${projectInfo.project.name}".

    Project description: ${projectInfo.project.description || "No description provided"}

    Current tasks: ${projectInfo.tasks.map(task => task.title).join(", ")}

    Additional context: ${context}

    Return ONLY a JSON array with the following structure:
    [
      {
        "title": "Task title",
        "description": "Detailed task description",
        "priority": "MEDIUM"
      }
    ]

    The priority must be one of: LOW, MEDIUM, HIGH, URGENT
    `;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task suggestion assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
    });

    // Parse the response
    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from AI");
    }

    // Extract JSON from the response
    const jsonMatch = response.match(/```json?\\s*(\[[\s\S]*\])\\s*```/) ||
                      response.match(/`(\[[\s\S]*\])`/) ||
                      response.match(/(\[[\s\S]*\])/);

    const jsonString = jsonMatch ? jsonMatch[1] : response;
    const suggestions = JSON.parse(jsonString.trim());

    return suggestions;
  } catch (error) {
    console.error("Failed to generate task suggestions:", error);
    throw error;
  }
}

/**
 * Generates a project summary
 * @param projectId - The ID of the project
 * @returns A summary of the project
 */
export async function generateProjectSummary(projectId: string) {
  try {
    // Get project info
    const projectInfo = await getProjectInfo(projectId);

    // Create the prompt
    const prompt = `
    Generate a concise summary of the project "${projectInfo.project.name}".

    Project description: ${projectInfo.project.description || "No description provided"}

    Project stats:
    - ${projectInfo.tasks.length} tasks
    - ${projectInfo.members.length} members

    Tasks: ${projectInfo.tasks.map(task => `${task.title} (${task.status})`).join(", ")}

    The summary should be 2-3 paragraphs and highlight the project's purpose, current status, and next steps.
    `;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a project summary assistant that provides concise and informative summaries." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
    });

    // Get the response
    const summary = completion.choices[0]?.message?.content || "Failed to generate summary";



    return summary;
  } catch (error) {
    console.error("Failed to generate project summary:", error);
    throw error;
  }
}

/**
 * Analyzes project progress
 * @param projectId - The ID of the project
 * @returns An analysis of the project's progress
 */
export async function analyzeProjectProgress(projectId: string) {
  try {
    // Get project info
    const projectInfo = await getProjectInfo(projectId);

    // Calculate basic stats
    const totalTasks = projectInfo.tasks.length;
    const completedTasks = projectInfo.tasks.filter(task => task.status === "DONE").length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Create the prompt
    const prompt = `
    Analyze the progress of the project "${projectInfo.project.name}".

    Project description: ${projectInfo.project.description || "No description provided"}

    Project stats:
    - ${totalTasks} total tasks
    - ${completedTasks} completed tasks (${completionRate.toFixed(1)}% completion rate)

    Tasks by status:
    ${projectInfo.statuses.map(status => {
      const count = projectInfo.tasks.filter(task => task.status === status.key).length;
      return `- ${status.name}: ${count} tasks`;
    }).join("\n")}

    Provide an analysis of the project's progress, including:
    1. Current status assessment
    2. Potential bottlenecks or issues
    3. Recommendations for improving progress

    Return the analysis in a structured format with clear sections.
    `;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a project analysis assistant that provides insightful and actionable analysis." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
    });

    // Get the response
    const analysis = completion.choices[0]?.message?.content || "Failed to generate analysis";



    return analysis;
  } catch (error) {
    console.error("Failed to analyze project progress:", error);
    throw error;
  }
}

/**
 * Generates a project roadmap
 * @param projectId - The ID of the project
 * @param timeframe - The timeframe for the roadmap (e.g., "2 weeks", "3 months")
 * @returns A project roadmap
 */
export async function generateProjectRoadmap(projectId: string, timeframe: string = "1 month") {
  try {
    // Get project info
    const projectInfo = await getProjectInfo(projectId);

    // Create the prompt
    const prompt = `
    Generate a roadmap for the project "${projectInfo.project.name}" for the next ${timeframe}.

    Project description: ${projectInfo.project.description || "No description provided"}

    Current tasks: ${projectInfo.tasks.map(task => `${task.title} (${task.status})`).join(", ")}

    The roadmap should include:
    1. Key milestones
    2. Timeline estimates
    3. Dependencies between tasks
    4. Resource allocation recommendations

    Format the roadmap in a clear, structured way with weekly or monthly sections.
    `;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a project roadmap assistant that creates detailed and realistic roadmaps." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
    });

    // Get the response
    const roadmap = completion.choices[0]?.message?.content || "Failed to generate roadmap";



    return roadmap;
  } catch (error) {
    console.error("Failed to generate project roadmap:", error);
    throw error;
  }
}
