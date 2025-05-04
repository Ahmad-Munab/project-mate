/**
 * Tool Processor
 * This file implements functions to process tool calls in AI responses
 */

import { toast } from "sonner";

/**
 * Process tool calls in an AI response
 * @param message - The AI's response message
 * @param projectId - The ID of the project
 * @returns The processed message
 */
export async function processToolCalls(message: string, projectId: string): Promise<string> {
  // Check if the message contains a tool call
  if (!message.includes("<tool>") || !message.includes("</tool>")) {
    return message;
  }

  console.log("Processing tool calls in message");
  
  // Extract all tool calls
  const toolRegex = /<tool>(.*?)<\/tool>\s*<parameters>([\s\S]*?)<\/parameters>/gi;
  const toolMatches = Array.from(message.matchAll(toolRegex));
  
  if (toolMatches.length === 0) {
    return message;
  }
  
  console.log(`Found ${toolMatches.length} tool calls in the response`);
  
  let processedMessage = message;
  
  // Process each tool call
  for (const [fullMatch, toolName, paramsStr] of toolMatches) {
    try {
      // Parse parameters
      const params = JSON.parse(paramsStr);
      
      // Process based on tool type
      if (toolName === "create_task") {
        processedMessage = await processCreateTaskTool(processedMessage, fullMatch, params, projectId);
      } else if (toolName === "create_column") {
        processedMessage = await processCreateColumnTool(processedMessage, fullMatch, params, projectId);
      }
      // Add more tool processors as needed
      
    } catch (e) {
      console.error("Error processing tool call:", e);
    }
  }
  
  return processedMessage;
}

/**
 * Process a create_task tool call
 * @param message - The original message
 * @param fullMatch - The full tool call match
 * @param params - The tool parameters
 * @param projectId - The project ID
 * @returns The processed message
 */
async function processCreateTaskTool(
  message: string, 
  fullMatch: string, 
  params: any, 
  projectId: string
): Promise<string> {
  try {
    // Make a direct API call to create the task
    const taskResponse = await fetch("/api/tasks/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        title: params.title,
        description: params.description,
        status: params.status || "BACKLOG",
        priority: params.priority || "MEDIUM",
        techIcons: params.techIcons,
      }),
    });
    
    if (taskResponse.ok) {
      const taskResult = await taskResponse.json();
      console.log("Task created successfully:", taskResult);
      toast.success("Task created successfully!");
      
      // Replace the tool call with a success message
      return message.replace(
        fullMatch,
        `Task "${params.title}" created successfully!`
      );
    } else {
      console.error("Failed to create task:", await taskResponse.text());
      toast.error("Failed to create task");
      
      // Replace the tool call with an error message
      return message.replace(
        fullMatch,
        `I tried to create task "${params.title}" but encountered an error.`
      );
    }
  } catch (error) {
    console.error("Error processing create_task tool:", error);
    return message;
  }
}

/**
 * Process a create_column tool call
 * @param message - The original message
 * @param fullMatch - The full tool call match
 * @param params - The tool parameters
 * @param projectId - The project ID
 * @returns The processed message
 */
async function processCreateColumnTool(
  message: string, 
  fullMatch: string, 
  params: any, 
  projectId: string
): Promise<string> {
  try {
    if (!params.name) {
      console.error("Column name is required");
      return message.replace(
        fullMatch,
        `I tried to create a column but no name was provided.`
      );
    }
    
    // Make a direct API call to create the column
    const columnResponse = await fetch(`/api/projects/${projectId}/task-statuses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.name,
        key: params.name.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
        color: params.color || "blue",
        order: 999, // High number to place at the end
      }),
    });
    
    if (columnResponse.ok) {
      const columnResult = await columnResponse.json();
      console.log("Column created successfully:", columnResult);
      toast.success(`Column "${params.name}" created successfully!`);
      
      // Replace the tool call with a success message
      return message.replace(
        fullMatch,
        `Column "${params.name}" created successfully!`
      );
    } else {
      const errorText = await columnResponse.text();
      console.error("Failed to create column:", errorText);
      toast.error("Failed to create column");
      
      // Check for specific error messages
      if (errorText.includes("already exists")) {
        return message.replace(
          fullMatch,
          `I tried to create a "${params.name}" column, but a column with this name already exists.`
        );
      }
      
      // Replace the tool call with an error message
      return message.replace(
        fullMatch,
        `I tried to create a "${params.name}" column but encountered an error.`
      );
    }
  } catch (error) {
    console.error("Error processing create_column tool:", error);
    return message;
  }
}
