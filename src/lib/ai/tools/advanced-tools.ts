/**
 * Advanced AI Tools
 * This file contains advanced AI tools for project management
 * These tools provide more sophisticated capabilities beyond basic CRUD operations
 */

import { groq } from "@/lib/groq";
import { getProjectInfo, getProjectTasks, getTaskStatuses } from "./project-tools";
import { createTask } from "./task-tools";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Generate code for a specific task
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task
 * @param language - The programming language to generate code in
 * @param description - Additional description or requirements
 * @returns Generated code with explanation
 */
export async function generateTaskCode(
  projectId: string,
  taskId: string,
  language: string = "typescript",
  description: string = ""
): Promise<{ code: string; explanation: string }> {
  try {
    // Get project and task info for context
    const projectInfo = await getProjectInfo(projectId);
    
    // Get the specific task
    const task = projectInfo.tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Create the prompt
    const prompt = `
    Generate code for the following task in ${language}:
    
    Task: ${task.title}
    Description: ${task.description || "No description provided"}
    Additional requirements: ${description}
    
    Project context: ${projectInfo.project.description || "No description provided"}
    
    Provide:
    1. Well-structured, production-ready code that implements this task
    2. A brief explanation of how the code works
    3. Any assumptions you made
    
    The code should follow best practices for ${language}, be well-commented, and handle edge cases.
    `;
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `You are an expert ${language} developer who writes clean, efficient, and well-documented code. You provide detailed explanations of your code.` 
        },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.3, // Lower temperature for more precise code generation
    });
    
    // Get the response
    const response = completion.choices[0]?.message?.content || "Failed to generate code";
    
    // Extract code and explanation
    const codeMatch = response.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
    const code = codeMatch ? codeMatch[1] : "";
    
    // Everything outside the code blocks is the explanation
    let explanation = response.replace(/```(?:\w+)?\s*[\s\S]*?\s*```/g, "").trim();
    
    return {
      code,
      explanation
    };
  } catch (error) {
    console.error("Failed to generate task code:", error);
    throw error;
  }
}

/**
 * Provide technical advice for a task
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task
 * @param question - The specific technical question
 * @returns Technical advice
 */
export async function provideTechnicalAdvice(
  projectId: string,
  taskId: string,
  question: string
): Promise<string> {
  try {
    // Get project and task info for context
    const projectInfo = await getProjectInfo(projectId);
    
    // Get the specific task
    const task = projectInfo.tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Create the prompt
    const prompt = `
    Provide technical advice for the following task:
    
    Task: ${task.title}
    Description: ${task.description || "No description provided"}
    
    Project context: ${projectInfo.project.description || "No description provided"}
    
    Technical question: ${question}
    
    Provide detailed, actionable advice that addresses the question directly.
    Include code examples, best practices, and potential pitfalls where relevant.
    `;
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a senior technical advisor with expertise in software development. You provide practical, actionable advice based on industry best practices." 
        },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
    });
    
    // Get the response
    const advice = completion.choices[0]?.message?.content || "Failed to generate technical advice";
    
    return advice;
  } catch (error) {
    console.error("Failed to provide technical advice:", error);
    throw error;
  }
}

/**
 * Generate a detailed implementation plan for a task
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task
 * @returns Implementation plan with subtasks
 */
export async function generateImplementationPlan(
  projectId: string,
  taskId: string
): Promise<{ plan: string; subtasks: Array<{ title: string; description: string; priority: string }> }> {
  try {
    // Get project and task info for context
    const projectInfo = await getProjectInfo(projectId);
    
    // Get the specific task
    const task = projectInfo.tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Create the prompt
    const prompt = `
    Create a detailed implementation plan for the following task:
    
    Task: ${task.title}
    Description: ${task.description || "No description provided"}
    
    Project context: ${projectInfo.project.description || "No description provided"}
    
    Provide:
    1. A step-by-step implementation plan
    2. A list of subtasks in JSON format
    
    The JSON format for subtasks should be:
    [
      {
        "title": "Subtask title",
        "description": "Detailed description",
        "priority": "MEDIUM"
      }
    ]
    
    The priority must be one of: LOW, MEDIUM, HIGH, URGENT
    
    First provide the implementation plan in markdown format, then provide the JSON array of subtasks.
    `;
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a technical project manager who creates detailed implementation plans. You break down complex tasks into manageable subtasks." 
        },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
    });
    
    // Get the response
    const response = completion.choices[0]?.message?.content || "Failed to generate implementation plan";
    
    // Extract the JSON array of subtasks
    const jsonMatch = response.match(/```(?:json)?\s*([\[\{][\s\S]*?[\]\}])\s*```/) || 
                      response.match(/([\[\{][\s\S]*?[\]\}])/);
    
    let subtasks = [];
    if (jsonMatch) {
      try {
        subtasks = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse subtasks JSON:", e);
      }
    }
    
    // Everything before the JSON is the plan
    const plan = response.replace(/```(?:json)?\s*[\[\{][\s\S]*?[\]\}]\s*```/, "").trim();
    
    return {
      plan,
      subtasks
    };
  } catch (error) {
    console.error("Failed to generate implementation plan:", error);
    throw error;
  }
}

/**
 * Create subtasks from an implementation plan
 * @param projectId - The ID of the project
 * @param parentTaskId - The ID of the parent task
 * @param subtasks - Array of subtask definitions
 * @returns Array of created subtasks
 */
export async function createSubtasks(
  projectId: string,
  parentTaskId: string,
  subtasks: Array<{ title: string; description: string; priority: string }>
): Promise<any[]> {
  try {
    const createdSubtasks = [];
    
    // Get the parent task for reference
    const projectInfo = await getProjectInfo(projectId);
    const parentTask = projectInfo.tasks.find(t => t.id === parentTaskId);
    
    if (!parentTask) {
      throw new Error(`Parent task with ID ${parentTaskId} not found`);
    }
    
    // Create each subtask
    for (const subtask of subtasks) {
      const newTask = await createTask(
        projectId,
        `${subtask.title} (Subtask)`,
        subtask.description,
        parentTask.status_key || "BACKLOG",
        subtask.priority
      );
      
      // Update the task to link it to the parent task
      // This assumes you have a parent_task_id column in your tasks table
      // If not, you'll need to modify your schema
      try {
        await db
          .update(tasks)
          .set({
            parent_task_id: parentTaskId
          })
          .where(eq(tasks.id, newTask.id));
      } catch (e) {
        // If the parent_task_id column doesn't exist, just continue
        console.warn("Could not set parent task ID, column may not exist:", e);
      }
      
      createdSubtasks.push(newTask);
    }
    
    return createdSubtasks;
  } catch (error) {
    console.error("Failed to create subtasks:", error);
    throw error;
  }
}

/**
 * Analyze code quality and suggest improvements
 * @param code - The code to analyze
 * @param language - The programming language of the code
 * @returns Analysis and suggestions
 */
export async function analyzeCodeQuality(
  code: string,
  language: string = "typescript"
): Promise<{ analysis: string; suggestions: string[] }> {
  try {
    // Create the prompt
    const prompt = `
    Analyze the following ${language} code for quality, best practices, and potential improvements:
    
    \`\`\`${language}
    ${code}
    \`\`\`
    
    Provide:
    1. A detailed analysis of the code quality
    2. Specific suggestions for improvement
    3. Any potential bugs or issues
    
    Format your response with a general analysis section followed by a numbered list of specific suggestions.
    `;
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `You are a senior ${language} developer and code reviewer who specializes in identifying code quality issues and suggesting improvements.` 
        },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.3,
    });
    
    // Get the response
    const response = completion.choices[0]?.message?.content || "Failed to analyze code";
    
    // Extract the analysis and suggestions
    const sections = response.split(/#+\s*Suggestions|#+\s*Improvements/i);
    
    let analysis = sections[0].trim();
    let suggestionsText = sections.length > 1 ? sections[1].trim() : "";
    
    // Extract numbered suggestions
    const suggestions = suggestionsText
      .split(/\d+\.\s+/)
      .filter(Boolean)
      .map(s => s.trim());
    
    return {
      analysis,
      suggestions
    };
  } catch (error) {
    console.error("Failed to analyze code quality:", error);
    throw error;
  }
}

/**
 * Generate project documentation
 * @param projectId - The ID of the project
 * @param docType - The type of documentation to generate
 * @returns Generated documentation
 */
export async function generateProjectDocumentation(
  projectId: string,
  docType: "readme" | "api" | "architecture" | "setup" = "readme"
): Promise<string> {
  try {
    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);
    const tasks = await getProjectTasks(projectId);
    const statuses = await getTaskStatuses(projectId);
    
    // Create the prompt based on documentation type
    let prompt = "";
    let systemRole = "";
    
    switch (docType) {
      case "readme":
        prompt = `
        Generate a comprehensive README.md file for the following project:
        
        Project: ${projectInfo.project.name}
        Description: ${projectInfo.project.description || "No description provided"}
        
        Tasks: ${tasks.map(t => `- ${t.title}`).join('\n')}
        
        Include the following sections:
        1. Project Overview
        2. Features
        3. Installation
        4. Usage
        5. Project Structure
        6. Contributing
        7. License
        
        Make the README professional, informative, and well-structured using proper markdown formatting.
        `;
        systemRole = "You are a technical writer who specializes in creating clear, comprehensive documentation for software projects.";
        break;
        
      case "api":
        prompt = `
        Generate API documentation for the following project:
        
        Project: ${projectInfo.project.name}
        Description: ${projectInfo.project.description || "No description provided"}
        
        Tasks related to API: ${tasks.filter(t => t.title.toLowerCase().includes("api") || (t.description || "").toLowerCase().includes("api")).map(t => `- ${t.title}: ${t.description || ""}`).join('\n')}
        
        Include the following sections:
        1. API Overview
        2. Authentication
        3. Endpoints
        4. Request/Response Examples
        5. Error Handling
        6. Rate Limiting
        
        Make the documentation comprehensive, clear, and well-structured using proper markdown formatting.
        `;
        systemRole = "You are an API documentation specialist who creates detailed, accurate API documentation for developers.";
        break;
        
      case "architecture":
        prompt = `
        Generate architecture documentation for the following project:
        
        Project: ${projectInfo.project.name}
        Description: ${projectInfo.project.description || "No description provided"}
        
        Tasks: ${tasks.map(t => `- ${t.title}`).join('\n')}
        
        Include the following sections:
        1. System Overview
        2. Component Architecture
        3. Data Flow
        4. Database Schema
        5. Integration Points
        6. Security Considerations
        7. Scalability
        
        Make the documentation technical, comprehensive, and well-structured using proper markdown formatting.
        Include diagrams described in text (as if they were actual diagrams).
        `;
        systemRole = "You are a software architect who specializes in documenting system architecture and design decisions.";
        break;
        
      case "setup":
        prompt = `
        Generate setup documentation for the following project:
        
        Project: ${projectInfo.project.name}
        Description: ${projectInfo.project.description || "No description provided"}
        
        Tasks: ${tasks.map(t => `- ${t.title}`).join('\n')}
        
        Include the following sections:
        1. Prerequisites
        2. Installation Steps
        3. Configuration
        4. Environment Setup
        5. Running the Project
        6. Testing
        7. Troubleshooting
        
        Make the documentation clear, step-by-step, and well-structured using proper markdown formatting.
        `;
        systemRole = "You are a DevOps specialist who creates clear, step-by-step setup documentation for developers.";
        break;
    }
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemRole },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
    });
    
    // Get the response
    const documentation = completion.choices[0]?.message?.content || `Failed to generate ${docType} documentation`;
    
    return documentation;
  } catch (error) {
    console.error(`Failed to generate ${docType} documentation:`, error);
    throw error;
  }
}

/**
 * Estimate task complexity and time
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task
 * @returns Complexity and time estimates
 */
export async function estimateTaskComplexity(
  projectId: string,
  taskId: string
): Promise<{ complexity: string; timeEstimate: string; justification: string }> {
  try {
    // Get project and task info for context
    const projectInfo = await getProjectInfo(projectId);
    
    // Get the specific task
    const task = projectInfo.tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Create the prompt
    const prompt = `
    Estimate the complexity and time required for the following task:
    
    Task: ${task.title}
    Description: ${task.description || "No description provided"}
    
    Project context: ${projectInfo.project.description || "No description provided"}
    
    Provide:
    1. Complexity rating (Low, Medium, High, Very High)
    2. Time estimate (in hours or days)
    3. Justification for your estimates
    
    Format your response as a JSON object with the following structure:
    {
      "complexity": "Medium",
      "timeEstimate": "4-6 hours",
      "justification": "Detailed explanation of your reasoning"
    }
    `;
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a senior project manager with expertise in estimating task complexity and time requirements. You provide realistic, well-justified estimates." 
        },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.3,
    });
    
    // Get the response
    const response = completion.choices[0]?.message?.content || "Failed to estimate task complexity";
    
    // Extract the JSON object
    const jsonMatch = response.match(/```(?:json)?\s*([\{\[][\s\S]*?[\}\]])\s*```/) || 
                      response.match(/([\{\[][\s\S]*?[\}\]])/);
    
    if (jsonMatch) {
      try {
        const estimate = JSON.parse(jsonMatch[1]);
        return {
          complexity: estimate.complexity || "Unknown",
          timeEstimate: estimate.timeEstimate || "Unknown",
          justification: estimate.justification || "No justification provided"
        };
      } catch (e) {
        console.error("Failed to parse estimate JSON:", e);
      }
    }
    
    // Fallback if JSON parsing fails
    return {
      complexity: "Unknown",
      timeEstimate: "Unknown",
      justification: "Failed to parse estimate"
    };
  } catch (error) {
    console.error("Failed to estimate task complexity:", error);
    throw error;
  }
}

/**
 * Suggest project improvements based on current state
 * @param projectId - The ID of the project
 * @returns Suggested improvements
 */
export async function suggestProjectImprovements(
  projectId: string
): Promise<{ summary: string; suggestions: Array<{ title: string; description: string; impact: string; effort: string }> }> {
  try {
    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);
    const tasks = await getProjectTasks(projectId);
    const statuses = await getTaskStatuses(projectId);
    
    // Analyze task distribution
    const tasksByStatus = {};
    statuses.forEach(status => {
      tasksByStatus[status.key] = tasks.filter(task => task.status_key === status.key).length;
    });
    
    const tasksByPriority = {
      LOW: tasks.filter(task => task.priority === "LOW").length,
      MEDIUM: tasks.filter(task => task.priority === "MEDIUM").length,
      HIGH: tasks.filter(task => task.priority === "HIGH").length,
      URGENT: tasks.filter(task => task.priority === "URGENT").length,
    };
    
    // Create the prompt
    const prompt = `
    Analyze the following project and suggest improvements:
    
    Project: ${projectInfo.project.name}
    Description: ${projectInfo.project.description || "No description provided"}
    
    Task distribution by status:
    ${Object.entries(tasksByStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n')}
    
    Task distribution by priority:
    ${Object.entries(tasksByPriority).map(([priority, count]) => `- ${priority}: ${count}`).join('\n')}
    
    Provide:
    1. A summary of the current project state
    2. A list of specific improvement suggestions
    
    Format your suggestions as a JSON array with the following structure:
    [
      {
        "title": "Suggestion title",
        "description": "Detailed description",
        "impact": "High/Medium/Low",
        "effort": "High/Medium/Low"
      }
    ]
    
    First provide a summary analysis, then provide the JSON array of suggestions.
    `;
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a project management consultant who specializes in identifying process improvements and optimization opportunities." 
        },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.4,
    });
    
    // Get the response
    const response = completion.choices[0]?.message?.content || "Failed to suggest project improvements";
    
    // Extract the JSON array of suggestions
    const jsonMatch = response.match(/```(?:json)?\s*([\[\{][\s\S]*?[\]\}])\s*```/) || 
                      response.match(/([\[\{][\s\S]*?[\]\}])/);
    
    let suggestions = [];
    if (jsonMatch) {
      try {
        suggestions = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse suggestions JSON:", e);
      }
    }
    
    // Everything before the JSON is the summary
    const summary = response.replace(/```(?:json)?\s*[\[\{][\s\S]*?[\]\}]\s*```/, "").trim();
    
    return {
      summary,
      suggestions
    };
  } catch (error) {
    console.error("Failed to suggest project improvements:", error);
    throw error;
  }
}
