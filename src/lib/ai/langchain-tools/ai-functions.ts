/**
 * LangChain AI Functions
 * This file implements AI functions using LangChain
 */

import { ChatGroq } from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { getProjectInfo } from "../tools/project-tools";

/**
 * Create a LangChain model
 * @returns A LangChain model
 */
function createModel(temperature: number = 0.7) {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "llama3-70b-8192",
    temperature,
  });
}

/**
 * Generate task suggestions for a project
 * @param projectId - The ID of the project
 * @param count - Number of tasks to suggest
 * @param context - Additional context for task generation
 * @returns An array of task suggestions
 */
export async function generateTaskSuggestions(
  projectId: string,
  count: number = 3,
  context: string = ""
): Promise<Array<{ title: string; description: string; priority: string }>> {
  try {
    // Get project information
    const projectInfo = await getProjectInfo(projectId);
    
    // Define the output schema
    const taskSuggestionSchema = z.array(
      z.object({
        title: z.string().describe("The title of the task"),
        description: z.string().describe("A detailed description of the task"),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).describe("The priority of the task"),
      })
    );
    
    // Create the output parser
    const outputParser = StructuredOutputParser.fromZodSchema(taskSuggestionSchema);
    
    // Create the prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a task suggestion assistant for a project management system.

Project: {projectName}
Description: {projectDescription}

Current tasks:
{currentTasks}

Additional context:
{additionalContext}

Generate {count} specific, practical task suggestions for this project. Each task should include:
1. A clear, concise title
2. A detailed description with implementation guidance
3. A priority level (LOW, MEDIUM, HIGH, URGENT)

{format_instructions}
    `);
    
    // Create the model
    const model = createModel(0.4);
    
    // Create the chain
    const chain = RunnableSequence.from([
      {
        promptInput: async (input: { 
          projectName: string; 
          projectDescription: string;
          currentTasks: string;
          additionalContext: string;
          count: number;
        }) => {
          return {
            projectName: input.projectName,
            projectDescription: input.projectDescription,
            currentTasks: input.currentTasks,
            additionalContext: input.additionalContext,
            count: input.count,
            format_instructions: outputParser.getFormatInstructions(),
          };
        },
      },
      {
        prompt: promptTemplate,
        promptInput: (formattedInput) => formattedInput,
      },
      model,
      outputParser,
    ]);
    
    // Run the chain
    const result = await chain.invoke({
      projectName: projectInfo.project.name,
      projectDescription: projectInfo.project.description || "No description provided",
      currentTasks: projectInfo.tasks.map(task => `- ${task.title} (Status: ${task.status})`).join('\n'),
      additionalContext: context,
      count,
    });
    
    return result;
  } catch (error) {
    console.error("Failed to generate task suggestions:", error);
    return [];
  }
}

/**
 * Generate a summary of the project
 * @param projectId - The ID of the project
 * @returns A summary of the project
 */
export async function generateProjectSummary(projectId: string): Promise<string> {
  try {
    // Get project information
    const projectInfo = await getProjectInfo(projectId);
    
    // Create the prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a project summary generator for a project management system.

Project: {projectName}
Description: {projectDescription}

Project stats:
- {taskCount} tasks
- {memberCount} members

Tasks:
{taskList}

Generate a concise summary of the project that highlights:
1. The project's purpose and goals
2. Current status and progress
3. Key challenges and next steps

The summary should be 2-3 paragraphs and professional in tone.
    `);
    
    // Create the model
    const model = createModel(0.5);
    
    // Create the chain
    const chain = RunnableSequence.from([
      promptTemplate,
      model,
      new StringOutputParser(),
    ]);
    
    // Run the chain
    const result = await chain.invoke({
      projectName: projectInfo.project.name,
      projectDescription: projectInfo.project.description || "No description provided",
      taskCount: projectInfo.tasks.length,
      memberCount: projectInfo.members.length,
      taskList: projectInfo.tasks.map(task => `- ${task.title} (Status: ${task.status}, Priority: ${task.priority})`).join('\n'),
    });
    
    return result;
  } catch (error) {
    console.error("Failed to generate project summary:", error);
    return "Failed to generate project summary.";
  }
}

/**
 * Analyze the progress of a project
 * @param projectId - The ID of the project
 * @returns An analysis of the project progress
 */
export async function analyzeProjectProgress(projectId: string): Promise<string> {
  try {
    // Get project information
    const projectInfo = await getProjectInfo(projectId);
    
    // Calculate task statistics
    const totalTasks = projectInfo.tasks.length;
    const completedTasks = projectInfo.tasks.filter(task => task.status === "DONE").length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const tasksByStatus = projectInfo.tasks.reduce((acc: Record<string, number>, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});
    
    const tasksByPriority = projectInfo.tasks.reduce((acc: Record<string, number>, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});
    
    // Create the prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a project progress analyzer for a project management system.

Project: {projectName}
Description: {projectDescription}

Task Statistics:
- Total Tasks: {totalTasks}
- Completed Tasks: {completedTasks}
- Completion Rate: {completionRate}%

Tasks by Status:
{tasksByStatus}

Tasks by Priority:
{tasksByPriority}

Analyze the project progress and provide insights on:
1. Overall progress assessment
2. Task distribution and bottlenecks
3. Recommendations for improving progress
4. Potential risks and issues

The analysis should be detailed, data-driven, and actionable.
    `);
    
    // Create the model
    const model = createModel(0.5);
    
    // Create the chain
    const chain = RunnableSequence.from([
      promptTemplate,
      model,
      new StringOutputParser(),
    ]);
    
    // Run the chain
    const result = await chain.invoke({
      projectName: projectInfo.project.name,
      projectDescription: projectInfo.project.description || "No description provided",
      totalTasks,
      completedTasks,
      completionRate: completionRate.toFixed(2),
      tasksByStatus: Object.entries(tasksByStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n'),
      tasksByPriority: Object.entries(tasksByPriority).map(([priority, count]) => `- ${priority}: ${count}`).join('\n'),
    });
    
    return result;
  } catch (error) {
    console.error("Failed to analyze project progress:", error);
    return "Failed to analyze project progress.";
  }
}

/**
 * Generate a roadmap for the project
 * @param projectId - The ID of the project
 * @param timeframe - The timeframe for the roadmap
 * @returns A roadmap for the project
 */
export async function generateProjectRoadmap(
  projectId: string,
  timeframe: string = "1 month"
): Promise<string> {
  try {
    // Get project information
    const projectInfo = await getProjectInfo(projectId);
    
    // Create the prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a project roadmap generator for a project management system.

Project: {projectName}
Description: {projectDescription}

Current Tasks:
{taskList}

Generate a detailed roadmap for the next {timeframe} that includes:
1. Key milestones and their estimated completion dates
2. Task dependencies and sequencing
3. Critical path items
4. Potential risks and mitigation strategies

Format the roadmap in a clear, structured way with timeline estimates.
    `);
    
    // Create the model
    const model = createModel(0.5);
    
    // Create the chain
    const chain = RunnableSequence.from([
      promptTemplate,
      model,
      new StringOutputParser(),
    ]);
    
    // Run the chain
    const result = await chain.invoke({
      projectName: projectInfo.project.name,
      projectDescription: projectInfo.project.description || "No description provided",
      taskList: projectInfo.tasks.map(task => `- ${task.title} (Status: ${task.status}, Priority: ${task.priority})`).join('\n'),
      timeframe,
    });
    
    return result;
  } catch (error) {
    console.error("Failed to generate project roadmap:", error);
    return "Failed to generate project roadmap.";
  }
}
