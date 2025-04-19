'use server'

import { createClient } from "@/utils/supabase/server";
import {
  createTask,
  getProjectInfo,
  createTaskStatus,
  getTaskStatuses,
  moveTask,
  getProjectTasks,
  deleteTask,
  deleteTaskStatus,
  updateTask
} from "@/lib/ai/langchain/tools";
import { tasks as TaskSchema } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";
import { storeEnhancedMessage } from "@/lib/ai/memory/enhanced";
import { runAgent } from "@/lib/ai";
import { Groq } from "groq-sdk";

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

    // Get custom columns (task statuses)
    const customColumns = await getTaskStatuses(projectId);
    const columnOptions = customColumns.map(col => `"${col.key}": "${col.name}"`);

    // Determine if we need to create a new column based on the task description
    const needsNewColumn = taskDescription.toLowerCase().includes("new feature") ||
                          taskDescription.toLowerCase().includes("new module") ||
                          taskDescription.toLowerCase().includes("new section") ||
                          taskDescription.toLowerCase().includes("new component") ||
                          taskDescription.toLowerCase().includes("implement") ||
                          taskDescription.toLowerCase().includes("integration");

    // Initialize Groq API client
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // If we might need a new column, first ask the AI if a new column is appropriate
    let newColumnName = "";
    let newColumnKey = "";
    let shouldCreateNewColumn = false;

    if (needsNewColumn) {
      const columnPrompt = `
      Based on this task description: "${taskDescription}" for the project "${projectInfo.project.name}",
      determine if a new column (task status) should be created to organize this type of task.

      Existing columns: ${customColumns.map(col => col.name).join(", ")}

      Return ONLY a JSON object with the following structure:
      {
        "needsNewColumn": true/false,
        "columnName": "Name of the new column if needed",
        "reason": "Brief explanation of why a new column is or isn't needed"
      }

      Only suggest a new column if it represents a distinct workflow state or feature area that doesn't exist yet.
      DO NOT include any explanations or additional text, ONLY the JSON object.
      `;

      // Call Groq API to determine if a new column is needed
      const columnCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are a project organization assistant that outputs only valid JSON." },
          { role: "user", content: columnPrompt }
        ],
        model: "llama3-70b-8192",
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const columnResponse = columnCompletion.choices[0]?.message?.content;

      if (columnResponse) {
        try {
          const columnData = JSON.parse(columnResponse);
          shouldCreateNewColumn = columnData.needsNewColumn;

          if (shouldCreateNewColumn) {
            // Create the new column
            newColumnName = columnData.columnName;
            newColumnKey = newColumnName.toUpperCase().replace(/\s+/g, "_");

            // Check if a similar column already exists
            const similarColumn = customColumns.find(col =>
              col.name.toLowerCase() === newColumnName.toLowerCase() ||
              col.name.toLowerCase().includes(newColumnName.toLowerCase()) ||
              newColumnName.toLowerCase().includes(col.name.toLowerCase())
            );

            if (!similarColumn) {
              // Create the new column
              const newColumn = await createTaskStatus(
                projectId,
                newColumnName,
                "blue" // Default color
              );

              // Add the new column to our options
              if (newColumn) {
                columnOptions.push(`"${newColumn.key}": "${newColumn.name}"`);
                newColumnKey = newColumn.key;
              }
            } else {
              // Use the existing similar column
              newColumnKey = similarColumn.key;
              newColumnName = similarColumn.name;
            }
          }
        } catch (error) {
          console.error("Failed to parse column AI response:", error);
          // Continue with task creation even if column creation fails
        }
      }
    }

    // Parse the task description to extract task details
    const taskPrompt = `
    Based on this description: "${taskDescription}", create a well-structured task for the project "${projectInfo.project.name}".

    ${customColumns.length > 0 ? `Available custom columns (statuses): {${columnOptions.join(', ')}}` : ''}
    ${newColumnKey ? `A new column "${newColumnName}" has been created for this task.` : ''}

    Return ONLY a JSON object with the following structure:
    {
      "title": "A clear, concise title",
      "description": "A detailed description of what needs to be done",
      "status": ${newColumnKey ? `"${newColumnKey}"` : `"BACKLOG"`},
      "priority": "HIGH"
    }

    The status must be one of: ${customColumns.length > 0 ?
      [...new Set([...customColumns.map(col => `"${col.key}"`), '"BACKLOG"', '"TODO"', '"IN_PROGRESS"', '"DONE"'])].join(', ') :
      '"BACKLOG", "TODO", "IN_PROGRESS", "DONE"'}
    The priority must be one of: "LOW", "MEDIUM", "HIGH", "URGENT"

    Choose the most appropriate status for this task based on its nature and the available columns.
    DO NOT include any explanations or additional text, ONLY the JSON object.
    `;

    // Call Groq API directly for structured output

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

    // Prepare the response message
    let responseMessage = task ? `I've created a new task:\n\nTitle: ${task.title}\nDescription: ${task.description}\nStatus: ${task.status}\nPriority: ${task.priority}` : "Failed to create task";

    // Add information about the column if a new one was created
    if (shouldCreateNewColumn && newColumnName) {
      responseMessage = `I've created a new column "${newColumnName}" for organizing this type of task.\n\n${responseMessage}`;
    }

    // Store the action in memory
    if (task) {
      await storeEnhancedMessage(
        projectId,
        {
          role: "assistant",
          content: responseMessage,
          timestamp: new Date(),
        },
        task.id.toString()
      );
    } else {
      await storeEnhancedMessage(
        projectId,
        {
          role: "assistant",
          content: responseMessage,
          timestamp: new Date(),
        }
      );
    }

    // Return success with task details
    return {
      success: true,
      task,
      newColumn: shouldCreateNewColumn ? newColumnName : null,
      message: responseMessage
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
    const response = await runAgent(
      projectId,
      `The project "${projectInfo.project.name}" needs its description updated to: ${newDescription}. Please update it and confirm the change.`
    );

    return { success: true, message: response };
  } catch (error) {
    console.error("Failed to update project description:", error);
    return { error: "Failed to update project description" };
  }
}

// Action to create a column via AI
export async function createColumnViaAI(
  projectId: string,
  columnDescription: string
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

    // Get existing columns
    const existingColumns = await getTaskStatuses(projectId);
    const existingColumnNames = existingColumns.map(col => col.name.toLowerCase());

    // Parse the column description to extract column details
    const columnPrompt = `
    Based on this description: "${columnDescription}", create a well-structured column (task status) for the project "${projectInfo.project.name}".

    Existing columns: ${existingColumnNames.join(", ")}

    Return ONLY a JSON object with the following structure:
    {
      "name": "A clear, concise name",
      "color": "A color for the column (e.g., gray, blue, green, red, yellow, purple)"
    }

    DO NOT include any explanations or additional text, ONLY the JSON object.
    `;

    // Call Groq API directly for structured output
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a column creation assistant that outputs only valid JSON." },
        { role: "user", content: columnPrompt }
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
    let columnData;
    try {
      columnData = JSON.parse(aiResponse);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return { error: "Failed to parse AI response" };
    }

    // Check if column with similar name already exists
    const similarColumn = existingColumns.find(col =>
      col.name.toLowerCase() === columnData.name.toLowerCase() ||
      col.name.toLowerCase().includes(columnData.name.toLowerCase()) ||
      columnData.name.toLowerCase().includes(col.name.toLowerCase())
    );

    if (similarColumn) {
      return {
        success: true,
        column: similarColumn,
        message: `I found an existing column that matches your request: "${similarColumn.name}". This column is already set up in your project.`
      };
    }

    // Create the column
    const column = await createTaskStatus(
      projectId,
      columnData.name,
      columnData.color || "gray"
    );

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: column ? `I've created a new column:\n\nName: ${column.name}\nColor: ${column.color}` : "Failed to create column",
        timestamp: new Date(),
      }
    );

    // Return success with column details
    return {
      success: true,
      column,
      message: column ? `I've created a new column:\n\nName: ${column.name}\nColor: ${column.color}` : "Failed to create column"
    };
  } catch (error) {
    console.error("Failed to create column via AI:", error);
    return { error: "Failed to create column" };
  }
}

// Action to move a task to a different column
export async function moveTaskViaAI(
  projectId: string,
  taskDescription: string,
  targetColumnDescription: string
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

    // Get all tasks
    const allTasks = await getProjectTasks(projectId);

    // Get all columns
    const allColumns = await getTaskStatuses(projectId);

    // Find the task based on description
    const taskPrompt = `
    Based on this description: "${taskDescription}", find the most relevant task in the project "${projectInfo.project.name}".

    Available tasks: ${allTasks.map(t => `"${t.title}"`).join(", ")}

    Return ONLY a JSON object with the following structure:
    {
      "taskId": "The ID of the task that best matches the description"
    }

    If no task matches, return { "taskId": null }

    DO NOT include any explanations or additional text, ONLY the JSON object.
    `;

    // Find the column based on description
    const columnPrompt = `
    Based on this description: "${targetColumnDescription}", find the most relevant column in the project "${projectInfo.project.name}".

    Available columns: ${allColumns.map(c => `"${c.name}"`).join(", ")}

    Return ONLY a JSON object with the following structure:
    {
      "columnId": "The ID of the column that best matches the description"
    }

    If no column matches, return { "columnId": null }

    DO NOT include any explanations or additional text, ONLY the JSON object.
    `;

    // Call Groq API for task matching
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    const taskCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task matching assistant that outputs only valid JSON." },
        { role: "user", content: taskPrompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    // Get task response
    const taskResponse = taskCompletion.choices[0]?.message?.content;
    if (!taskResponse) {
      return { error: "No response from AI for task matching" };
    }

    // Parse task JSON
    let taskData;
    try {
      taskData = JSON.parse(taskResponse);
    } catch (error) {
      console.error("Failed to parse AI task response:", error);
      return { error: "Failed to parse AI task response" };
    }

    if (!taskData.taskId) {
      return { error: "No matching task found" };
    }

    // Call Groq API for column matching
    const columnCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a column matching assistant that outputs only valid JSON." },
        { role: "user", content: columnPrompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    // Get column response
    const columnResponse = columnCompletion.choices[0]?.message?.content;
    if (!columnResponse) {
      return { error: "No response from AI for column matching" };
    }

    // Parse column JSON
    let columnData;
    try {
      columnData = JSON.parse(columnResponse);
    } catch (error) {
      console.error("Failed to parse AI column response:", error);
      return { error: "Failed to parse AI column response" };
    }

    if (!columnData.columnId) {
      return { error: "No matching column found" };
    }

    // Get the task and column objects
    const task = allTasks.find(t => t.id === taskData.taskId);
    const column = allColumns.find(c => c.id === columnData.columnId);

    if (!task) {
      return { error: "Task not found" };
    }

    if (!column) {
      return { error: "Column not found" };
    }

    // Move the task to the column
    const updatedTask = await moveTask(task.id, column.id, projectId);

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I've moved the task "${task.title}" to the "${column.name}" column.`,
        timestamp: new Date(),
      },
      task.id
    );

    // Return success with task details
    return {
      success: true,
      task: updatedTask,
      column,
      message: `I've moved the task "${task.title}" to the "${column.name}" column.`
    };
  } catch (error) {
    console.error("Failed to move task via AI:", error);
    return { error: "Failed to move task" };
  }
}

// Action to perform any AI action
// Action to delete a task via AI
export async function deleteTaskViaAI(
  projectId: string,
  taskIdentifier: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // We'll use the Task type defined elsewhere

    // Get project tasks
    const tasks = await getProjectTasks(projectId);

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Check if this is a domain-specific request (e.g., "delete payment related things")
    const isDomainSpecific = (
      taskIdentifier.includes("related") ||
      taskIdentifier.includes("stuff") ||
      taskIdentifier.includes("things") ||
      taskIdentifier.includes("all") ||
      taskIdentifier.includes("everything")
    );

    // If this is a domain-specific request, handle it differently
    if (isDomainSpecific) {
      return await deleteDomainSpecificTasksViaAI(projectId, taskIdentifier);
    }

    // Use AI to identify the task to delete
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to identify the task
    const prompt = `
    You are an AI assistant helping to identify a specific task to delete in a project.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    The user wants to delete a task matching this description: "${taskIdentifier}"

    Here are all the tasks in the project:
    ${tasks.map((task, index) => `${index + 1}. Title: ${task.title}\nDescription: ${task.description || "No description"}\nStatus: ${task.status}\nPriority: ${task.priority}\n`).join('\n')}

    Please identify which task best matches the user's request to delete "${taskIdentifier}".
    Consider partial matches, semantic similarity, and context.
    Be intelligent and understand the semantic meaning, not just literal text.

    Return ONLY a JSON object with the following structure:
    {
      "taskIndex": number, // 1-based index of the task to delete, or null if no match
      "confidence": number, // 0-1 confidence score
      "reasoning": string // Brief explanation of why this task was selected
    }
    `;

    // Call Groq API to identify the task
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task management assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
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
      return { error: "Failed to identify task to delete" };
    }

    // Check if a task was found
    if (!taskData.taskIndex || taskData.confidence < 0.6) {
      return {
        error: `I couldn't find any tasks that match "${taskIdentifier}". Could you be more specific or provide the exact task name?`
      };
    }

    // Get the task to delete
    const taskToDelete = tasks[taskData.taskIndex - 1];

    if (!taskToDelete) {
      return { error: `Could not find a task matching "${taskIdentifier}"` };
    }

    // Delete the task
    await deleteTask(taskToDelete.id);

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I've deleted the task "${taskToDelete.title}".`,
        timestamp: new Date(),
      }
    );

    // Create a more intelligent response
    let message = `I've deleted the task "${taskToDelete.title}" (${taskToDelete.status}, ${taskToDelete.priority}).`;

    // Add reasoning if available
    if (taskData.reasoning) {
      message += `\n\n${taskData.reasoning}`;
    }

    return {
      success: true,
      message: message
    };
  } catch (error) {
    console.error("Failed to delete task via AI:", error);
    return { error: "Failed to delete task" };
  }
}

// Action to delete domain-specific tasks via AI
export async function deleteDomainSpecificTasksViaAI(
  projectId: string,
  domainDescription: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Define the task type for better type safety
    // Using InferSelectModel<typeof TaskSchema> directly in the code

    // Get project tasks
    const tasks = await getProjectTasks(projectId);

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Use AI to identify domain-specific tasks
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to identify domain-specific tasks
    const prompt = `
    You are an AI assistant helping to identify tasks related to a specific domain or category in a project.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    The user wants to delete tasks related to: "${domainDescription}"

    Here are all the tasks in the project:
    ${tasks.map((task, index) => `${index + 1}. Title: ${task.title}\nDescription: ${task.description || "No description"}\nStatus: ${task.status}\nPriority: ${task.priority}\n`).join('\n')}

    Please identify which tasks are related to "${domainDescription}".
    Consider semantic meaning, not just literal text matching.
    For example, if the domain is "payment", identify tasks related to billing, transactions, money, etc.
    Be intelligent and understand the domain conceptually.

    Return ONLY a JSON object with the following structure:
    {
      "relatedTasks": [
        {
          "index": number, // 1-based index of the task
          "reason": string // Brief explanation of why this task is related to the domain
        }
      ]
    }
    If there are no related tasks, return an empty array for relatedTasks.
    `;

    // Call Groq API to identify domain-specific tasks
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task management assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
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
      return { error: "Failed to identify domain-specific tasks" };
    }

    // Get the related tasks
    const relatedTasksInfo = taskData.relatedTasks || [];

    if (relatedTasksInfo.length === 0) {
      return {
        success: true,
        message: `I've analyzed all the tasks in your project, and I don't see any that are related to "${domainDescription}". If you're looking for something specific, please provide more details.`
      };
    }

    // Get the actual task objects
    const relatedTasks = relatedTasksInfo
      .map((info: { index: number, reason: string }) => ({
        task: tasks[info.index - 1],
        reason: info.reason
      }))
      .filter((item: { task: InferSelectModel<typeof TaskSchema>, reason: string }) => item.task); // Filter out undefined tasks

    // Delete the tasks
    for (const item of relatedTasks) {
      await deleteTask(item.task.id);
    }

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I've deleted ${relatedTasks.length} tasks related to "${domainDescription}".`,
        timestamp: new Date(),
      }
    );

    // Create a more intelligent response
    let message = `I've deleted ${relatedTasks.length} tasks related to "${domainDescription}":`;
    message += '\n\n';

    // List the tasks with reasons
    relatedTasks.forEach((item: { task: InferSelectModel<typeof TaskSchema>, reason: string }, index: number) => {
      const task = item.task;
      message += `${index + 1}. **"${task.title}"** (${task.status}, ${task.priority})\n`;
      message += `   Reason: ${item.reason}\n\n`;
    });

    return {
      success: true,
      message: message
    };
  } catch (error) {
    console.error("Failed to delete domain-specific tasks via AI:", error);
    return { error: "Failed to delete domain-specific tasks" };
  }
}

// Action to delete useless tasks via AI
export async function deleteUselessTasksViaAI(
  projectId: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project tasks
    const tasks = await getProjectTasks(projectId);

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Use AI to identify useless tasks
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to identify useless tasks
    const prompt = `
    You are an AI assistant helping to identify useless or unnecessary tasks in a project.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    Here are all the tasks in the project:
    ${tasks.map((task, index) => `${index + 1}. Title: ${task.title}\nDescription: ${task.description || "No description"}\nStatus: ${task.status}\nPriority: ${task.priority}\n`).join('\n')}

    Please identify which tasks appear to be useless, unnecessary, redundant, or just test tasks that should be deleted.
    Consider the following criteria:
    1. Tasks that are explicitly marked as test, dummy, or useless
    2. Tasks with very generic titles that don't add value (like "Test task")
    3. Tasks that are duplicates of other tasks
    4. Tasks that are clearly not relevant to the project
    5. Tasks that are completed but were just for testing purposes

    Return ONLY a JSON array with the indices (1-based) of tasks that should be deleted. For example: [1, 3, 5]
    If there are no useless tasks, return an empty array: []
    `;

    // Call Groq API to identify useless tasks
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task management assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return { error: "No response from AI" };
    }

    // Parse JSON from response
    let uselessTaskIndices;
    try {
      const responseObj = JSON.parse(aiResponse);
      uselessTaskIndices = Array.isArray(responseObj) ? responseObj : responseObj.indices || responseObj.tasks || [];
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return { error: "Failed to identify useless tasks" };
    }

    // Define the Task type based on the schema
    type Task = InferSelectModel<typeof TaskSchema>;

    // Convert 1-based indices to 0-based and get the tasks
    const uselessTasks = uselessTaskIndices
      .map((index: number | string) => tasks[Number(index) - 1])
      .filter((task: unknown): task is Task => !!task); // Filter out undefined tasks (in case of invalid indices)

    if (uselessTasks.length === 0) {
      return {
        success: true,
        message: "I've analyzed all the tasks in your project, and I don't see any that appear to be useless or unnecessary. All your current tasks seem to have a purpose in the project."
      };
    }

    // Delete the tasks
    for (const task of uselessTasks) {
      await deleteTask(task.id);
    }

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I've deleted ${uselessTasks.length} useless tasks.`,
        timestamp: new Date(),
      }
    );

    // First, get the preview of useless tasks to show detailed information
    const previewResult = await previewUselessTasksViaAI(projectId);

    // Create a more intelligent response with detailed information
    let message;

    if (previewResult.success && previewResult.message) {
      // Use the detailed message from the preview, but change the tense to past
      message = previewResult.message
        .replace("I've analyzed your project and found", "I've analyzed your project and deleted")
        .replace("appear to be unnecessary", "appeared to be unnecessary")
        .replace("Would you like me to delete these tasks? Please confirm.", "If I removed anything important, let me know and I can help you recreate it.");
    } else {
      // Fallback to a simpler message if preview fails
      message = `I've analyzed your project and deleted ${uselessTasks.length} tasks that appeared to be unnecessary:`;
      message += '\n\n';
      message += uselessTasks.map((task: Task) => `• "${task.title}" (${task.status}, ${task.priority})`).join('\n');
      message += '\n\n';
      message += "If I removed anything important, let me know and I can help you recreate it.";
    }

    return {
      success: true,
      message: message
    };
  } catch (error) {
    console.error("Failed to delete useless tasks via AI:", error);
    return { error: "Failed to delete useless tasks" };
  }
}

// Action to update tasks with solutions
export async function updateTasksWithSolutionsViaAI(
  projectId: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project tasks
    const tasks = await getProjectTasks(projectId);

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Use AI to generate solutions for tasks
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to generate solutions
    const prompt = `
    You are an AI assistant helping to add solutions to tasks in a project.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    Here are all the tasks in the project:
    ${tasks.map((task, index) => `${index + 1}. Title: ${task.title}\nDescription: ${task.description || "No description"}\nStatus: ${task.status}\nPriority: ${task.priority}\n`).join('\n')}

    For each task, generate a detailed solution that explains how to implement or solve the task.
    The solutions should be technical, specific, and actionable.

    Return ONLY a JSON object with the following structure:
    {
      "taskSolutions": [
        {
          "taskIndex": number, // 1-based index of the task
          "solution": string // Detailed technical solution for the task
        }
      ]
    }
    `;

    // Call Groq API to generate solutions
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a technical solution generator that outputs only valid JSON." },
        { role: "user", content: prompt }
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
    let solutionsData;
    try {
      solutionsData = JSON.parse(aiResponse);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return { error: "Failed to generate solutions" };
    }

    // Get the solutions
    const taskSolutions = solutionsData.taskSolutions || [];

    if (taskSolutions.length === 0) {
      return {
        success: true,
        message: "I couldn't generate solutions for any tasks. Please provide more details about the tasks."
      };
    }

    // Update each task with its solution
    const updatedTasks = [];
    for (const solution of taskSolutions) {
      const task = tasks[solution.taskIndex - 1];
      if (task) {
        // Append the solution to the task description
        const updatedDescription = `${task.description || ""}\n\n**Solution:**\n${solution.solution}`;

        // Update the task
        const updatedTask = await updateTask(task.id, {
          description: updatedDescription
        });

        updatedTasks.push(updatedTask);
      }
    }

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I've added detailed solutions to ${updatedTasks.length} tasks in your project.`,
        timestamp: new Date(),
      }
    );

    // Create a more intelligent response
    let message = `I've added detailed solutions to ${updatedTasks.length} tasks in your project:`;
    message += '\n\n';

    // List the tasks with solutions
    updatedTasks.forEach((task, index) => {
      if (task) {
        message += `${index + 1}. **"${task.title}"** (${task.status}, ${task.priority})\n`;
      } else {
        message += `${index + 1}. **Task not found**\n`;
      }
    });

    return {
      success: true,
      message: message,
      updatedTasks
    };
  } catch (error) {
    console.error("Failed to update tasks with solutions:", error);
    return { error: "Failed to update tasks with solutions" };
  }
}

// Action to delete a column via AI
export async function deleteColumnViaAI(
  projectId: string,
  columnIdentifier: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project columns
    const columns = await getTaskStatuses(projectId);

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Use AI to identify the column to delete
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to identify the column
    const prompt = `
    You are an AI assistant helping to identify a specific column to delete in a project's kanban board.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    The user wants to delete a column matching this description: "${columnIdentifier}"

    Here are all the columns in the project:
    ${columns.map((column, index) => `${index + 1}. Name: ${column.name}\nKey: ${column.key}\nColor: ${column.color}\nIs Default: ${column.is_default}\n`).join('\n')}

    Please identify which column best matches the user's request to delete "${columnIdentifier}".
    Consider partial matches, semantic similarity, and context.

    IMPORTANT: Default columns should not be deleted as they are essential to the system.

    Return ONLY a JSON object with the following structure:
    {
      "columnIndex": number, // 1-based index of the column to delete, or null if no match
      "confidence": number, // 0-1 confidence score
      "reasoning": string, // Brief explanation of why this column was selected
      "canDelete": boolean // Whether this column can be safely deleted (false for default columns)
    }
    `;

    // Call Groq API to identify the column
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task management assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return { error: "No response from AI" };
    }

    // Parse JSON from response
    let columnData;
    try {
      columnData = JSON.parse(aiResponse);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return { error: "Failed to identify column to delete" };
    }

    // Check if a column was found
    if (!columnData.columnIndex || columnData.confidence < 0.6) {
      return {
        error: `I couldn't find any columns that match "${columnIdentifier}". Could you be more specific or provide the exact column name?`
      };
    }

    // Check if the column can be deleted
    if (columnData.canDelete === false) {
      return {
        error: `I can't delete the "${columns[columnData.columnIndex - 1].name}" column because it's a default column that's essential to the system. Default columns like Backlog, To Do, In Progress, and Done cannot be deleted.`
      };
    }

    // Get the column to delete
    const columnToDelete = columns[columnData.columnIndex - 1];

    if (!columnToDelete) {
      return { error: `Could not find a column matching "${columnIdentifier}"` };
    }

    // Double-check that it's not a default column
    if (columnToDelete.is_default) {
      return {
        error: `I can't delete the "${columnToDelete.name}" column because it's a default column that's essential to the system.`
      };
    }

    // Delete the column
    await deleteTaskStatus(columnToDelete.id, projectId);

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I've deleted the column "${columnToDelete.name}".`,
        timestamp: new Date(),
      }
    );

    // Create a more intelligent response
    let message = `I've deleted the "${columnToDelete.name}" column from your project board.`;

    // Add reasoning if available
    if (columnData.reasoning) {
      message += `\n\n${columnData.reasoning}`;
    }

    // Add note about tasks
    message += `\n\nNote: Any tasks that were in this column have been moved to the default column.`;

    return {
      success: true,
      message: message
    };
  } catch (error) {
    console.error("Failed to delete column via AI:", error);
    return { error: "Failed to delete column" };
  }
}

// Action to preview useless tasks via AI (without deleting them)
export async function previewUselessTasksViaAI(
  projectId: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Define the task type for better type safety
    // Using InferSelectModel<typeof TaskSchema> directly in the code

    // Get project tasks
    const tasks = await getProjectTasks(projectId);

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Use AI to identify useless tasks
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to identify useless tasks
    const prompt = `
    You are an AI assistant helping to identify useless or unnecessary tasks in a project.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    Here are all the tasks in the project:
    ${tasks.map((task, index) => `${index + 1}. Title: ${task.title}\nDescription: ${task.description || "No description"}\nStatus: ${task.status}\nPriority: ${task.priority}\n`).join('\n')}

    Please identify which tasks appear to be useless, unnecessary, redundant, or just test tasks that should be deleted.
    Consider the following criteria:
    1. Tasks that are explicitly marked as test, dummy, or useless
    2. Tasks with very generic titles that don't add value (like "Test task")
    3. Tasks that are duplicates of other tasks
    4. Tasks that are clearly not relevant to the project
    5. Tasks that are completed but were just for testing purposes

    Return ONLY a JSON object with the following structure:
    {
      "uselessTasks": [
        {
          "index": number, // 1-based index of the task
          "reason": string // Brief explanation of why this task is considered useless
        }
      ]
    }
    If there are no useless tasks, return an empty array for uselessTasks.
    `;

    // Call Groq API to identify useless tasks
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task management assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
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
      return { error: "Failed to identify useless tasks" };
    }

    // Get the useless tasks
    const uselessTasksInfo = taskData.uselessTasks || [];

    if (uselessTasksInfo.length === 0) {
      return {
        success: true,
        message: "I've analyzed all the tasks in your project, and I don't see any that appear to be useless or unnecessary. All your current tasks seem to have a purpose in the project."
      };
    }

    // Get the actual task objects
    const uselessTasks = uselessTasksInfo
      .map((info: { index: number, reason: string }) => ({
        task: tasks[info.index - 1],
        reason: info.reason
      }))
      .filter((item: { task: InferSelectModel<typeof TaskSchema>, reason: string }) => item.task); // Filter out undefined tasks

    // Create a preview message
    let message = `I've analyzed your project and found ${uselessTasks.length} tasks that appear to be unnecessary:`;
    message += '\n\n';

    // List the tasks with reasons
    uselessTasks.forEach((item: { task: InferSelectModel<typeof TaskSchema>, reason: string }, index: number) => {
      const task = item.task;
      message += `${index + 1}. **"${task.title}"** (${task.status}, ${task.priority})\n`;
      message += `   Reason: ${item.reason}\n\n`;
    });

    message += "Would you like me to delete these tasks? Please confirm.";

    return {
      success: true,
      message: message,
      uselessTasks: uselessTasks.map((item: { task: InferSelectModel<typeof TaskSchema> }) => item.task)
    };
  } catch (error) {
    console.error("Failed to preview useless tasks via AI:", error);
    return { error: "Failed to preview useless tasks" };
  }
}

// Action to preview task deletion via AI (without deleting it)
export async function previewTaskDeletionViaAI(
  projectId: string,
  taskIdentifier: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project tasks
    const tasks = await getProjectTasks(projectId);

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Use AI to identify the task to delete
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to identify the task
    const prompt = `
    You are an AI assistant helping to identify a specific task to delete in a project.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    The user wants to delete a task matching this description: "${taskIdentifier}"

    Here are all the tasks in the project:
    ${tasks.map((task, index) => `${index + 1}. Title: ${task.title}\nDescription: ${task.description || "No description"}\nStatus: ${task.status}\nPriority: ${task.priority}\n`).join('\n')}

    Please identify which task best matches the user's request to delete "${taskIdentifier}".
    Consider partial matches, semantic similarity, and context.

    Return ONLY a JSON object with the following structure:
    {
      "taskIndex": number, // 1-based index of the task to delete, or null if no match
      "confidence": number, // 0-1 confidence score
      "reasoning": string // Brief explanation of why this task was selected
    }
    `;

    // Call Groq API to identify the task
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task management assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
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
      return { error: "Failed to identify task to delete" };
    }

    // Check if a task was found
    if (!taskData.taskIndex || taskData.confidence < 0.6) {
      return {
        error: `I couldn't find any tasks that match "${taskIdentifier}". Could you be more specific or provide the exact task name?`
      };
    }

    // Get the task to delete
    const taskToDelete = tasks[taskData.taskIndex - 1];

    if (!taskToDelete) {
      return { error: `Could not find a task matching "${taskIdentifier}"` };
    }

    // Create a preview message
    let message = `I found a task matching "${taskIdentifier}":\n\n`;
    message += `**Title:** ${taskToDelete.title}\n`;
    message += `**Status:** ${taskToDelete.status}\n`;
    message += `**Priority:** ${taskToDelete.priority}\n`;

    if (taskToDelete.description) {
      message += `**Description:** ${taskToDelete.description}\n`;
    }

    message += '\n';

    // Add reasoning if available
    if (taskData.reasoning) {
      message += `${taskData.reasoning}\n\n`;
    }

    message += "Would you like me to delete this task? Please confirm.";

    return {
      success: true,
      message: message,
      taskToDelete: taskToDelete
    };
  } catch (error) {
    console.error("Failed to preview task deletion via AI:", error);
    return { error: "Failed to preview task deletion" };
  }
}

// Action to update all tasks with solutions
export async function updateAllTasksWithSolutions(
  projectId: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project tasks
    const tasks = await getProjectTasks(projectId);

    if (tasks.length === 0) {
      return {
        success: true,
        message: "There are no tasks in this project to update with solutions."
      };
    }

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Use AI to generate solutions for tasks
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to generate solutions
    const prompt = `
    You are an AI assistant helping to add solutions to tasks in a project.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    Here are all the tasks in the project:
    ${tasks.map((task, index) => `${index + 1}. Title: ${task.title}\nDescription: ${task.description || "No description"}\nStatus: ${task.status}\nPriority: ${task.priority}\n`).join('\n')}

    For each task, generate a detailed solution that explains how to implement or solve the task.
    The solutions should be technical, specific, and actionable.

    Return ONLY a JSON object with the following structure:
    {
      "taskSolutions": [
        {
          "taskIndex": number, // 1-based index of the task
          "solution": string // Detailed technical solution for the task
        }
      ]
    }
    `;

    // Call Groq API to generate solutions
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a technical solution generator that outputs only valid JSON." },
        { role: "user", content: prompt }
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
    let solutionsData;
    try {
      solutionsData = JSON.parse(aiResponse);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return { error: "Failed to generate solutions" };
    }

    // Get the solutions
    const taskSolutions = solutionsData.taskSolutions || [];

    if (taskSolutions.length === 0) {
      return {
        success: true,
        message: "I couldn't generate solutions for any tasks. Please provide more details about the tasks."
      };
    }

    // Update each task with its solution
    const updatedTasks = [];
    for (const solution of taskSolutions) {
      // Find the task by index
      const task = tasks[solution.taskIndex - 1];

      if (task) {
        // Append the solution to the task description
        const updatedDescription = `${task.description || ""}\n\n**Solution:**\n${solution.solution}`;

        // Update the task
        const updatedTask = await updateTask(task.id, {
          description: updatedDescription
        });

        updatedTasks.push(updatedTask);
      }
    }

    // If no tasks were updated, try a different approach - update all tasks
    if (updatedTasks.length === 0) {
      // Generate a solution for each task individually
      for (const task of tasks) {
        // Create a prompt for this specific task
        const taskPrompt = `
        You are an AI assistant helping to add a solution to a specific task in a project.

        Project name: ${projectInfo.project.name}
        Project description: ${projectInfo.project.description || "No description provided"}

        Task details:
        Title: ${task.title}
        Description: ${task.description || "No description"}
        Status: ${task.status}
        Priority: ${task.priority}

        Generate a detailed solution that explains how to implement or solve this task.
        The solution should be technical, specific, and actionable.

        Return ONLY the solution text, without any additional formatting or explanation.
        `;

        // Call Groq API to generate a solution for this task
        const taskCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: "You are a technical solution generator." },
            { role: "user", content: taskPrompt }
          ],
          model: "llama3-70b-8192",
          temperature: 0.4,
        });

        // Get AI response
        const taskSolution = taskCompletion.choices[0]?.message?.content;

        if (taskSolution) {
          // Append the solution to the task description
          const updatedDescription = `${task.description || ""}\n\n**Solution:**\n${taskSolution}`;

          // Update the task
          const updatedTask = await updateTask(task.id, {
            description: updatedDescription
          });

          updatedTasks.push(updatedTask);
        }
      }
    }

    // Store the action in memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I've added detailed solutions to ${updatedTasks.length} tasks in your project.`,
        timestamp: new Date(),
      }
    );

    // Create a more intelligent response
    let message = `I've added detailed solutions to ${updatedTasks.length} tasks in your project:`;
    message += '\n\n';

    // List the tasks with solutions
    updatedTasks.forEach((task, index) => {
      if (task) {
        message += `${index + 1}. **"${task.title}"** (${task.status}, ${task.priority})\n`;
      } else {
        message += `${index + 1}. **Task not found**\n`;
      }
    });

    return {
      success: true,
      message: message,
      updatedTasks
    };
  } catch (error) {
    console.error("Failed to update tasks with solutions:", error);
    return { error: "Failed to update tasks with solutions" };
  }
}

// Action to preview domain-specific tasks via AI (without deleting them)
export async function previewDomainSpecificTasksViaAI(
  projectId: string,
  domainDescription: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Get project tasks
    const tasks = await getProjectTasks(projectId);

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Use AI to identify domain-specific tasks
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Create a prompt for the AI to identify domain-specific tasks
    const prompt = `
    You are an AI assistant helping to identify tasks related to a specific domain or category in a project.

    Project name: ${projectInfo.project.name}
    Project description: ${projectInfo.project.description || "No description provided"}

    The user wants to delete tasks related to: "${domainDescription}"

    Here are all the tasks in the project:
    ${tasks.map((task, index) => `${index + 1}. Title: ${task.title}\nDescription: ${task.description || "No description"}\nStatus: ${task.status}\nPriority: ${task.priority}\n`).join('\n')}

    Please identify which tasks are related to "${domainDescription}".
    Consider semantic meaning, not just literal text matching.
    For example, if the domain is "payment", identify tasks related to billing, transactions, money, etc.
    Be intelligent and understand the domain conceptually.

    Return ONLY a JSON object with the following structure:
    {
      "relatedTasks": [
        {
          "index": number, // 1-based index of the task
          "reason": string // Brief explanation of why this task is related to the domain
        }
      ]
    }
    If there are no related tasks, return an empty array for relatedTasks.
    `;

    // Call Groq API to identify domain-specific tasks
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a task management assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
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
      return { error: "Failed to identify domain-specific tasks" };
    }

    // Get the related tasks
    const relatedTasksInfo = taskData.relatedTasks || [];

    if (relatedTasksInfo.length === 0) {
      return {
        success: true,
        message: `I've analyzed all the tasks in your project, and I don't see any that are related to "${domainDescription}". If you're looking for something specific, please provide more details.`
      };
    }

    // Get the actual task objects
    const relatedTasks = relatedTasksInfo
      .map((info: { index: number, reason: string }) => ({
        task: tasks[info.index - 1],
        reason: info.reason
      }))
      .filter((item: { task: InferSelectModel<typeof TaskSchema>, reason: string }) => item.task); // Filter out undefined tasks

    // Create a preview message
    let message = `I've analyzed your project and found ${relatedTasks.length} tasks related to "${domainDescription}":`;
    message += '\n\n';

    // List the tasks with reasons
    relatedTasks.forEach((item: { task: InferSelectModel<typeof TaskSchema>, reason: string }, index: number) => {
      const task = item.task;
      message += `${index + 1}. **"${task.title}"** (${task.status}, ${task.priority})\n`;
      message += `   Reason: ${item.reason}\n\n`;
    });

    message += "Would you like me to delete these tasks? Please confirm.";

    return {
      success: true,
      message: message,
      relatedTasks: relatedTasks.map((item: { task: InferSelectModel<typeof TaskSchema> }) => item.task)
    };
  } catch (error) {
    console.error("Failed to preview domain-specific tasks via AI:", error);
    return { error: "Failed to preview domain-specific tasks" };
  }
}

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

    // Check if this is a column creation request
    const isColumnCreationRequest = (
      actionDescription.toLowerCase().includes("create column") ||
      actionDescription.toLowerCase().includes("add column") ||
      actionDescription.toLowerCase().includes("new column") ||
      actionDescription.toLowerCase().includes("create a column") ||
      actionDescription.toLowerCase().includes("make a column")
    );

    if (isColumnCreationRequest) {
      return await createColumnViaAI(projectId, actionDescription);
    }

    // Check if this is a task movement request
    const isTaskMoveRequest = (
      actionDescription.toLowerCase().includes("move task") ||
      actionDescription.toLowerCase().includes("move the task") ||
      actionDescription.toLowerCase().includes("change status") ||
      actionDescription.toLowerCase().includes("change the status") ||
      (actionDescription.toLowerCase().includes("move") &&
       actionDescription.toLowerCase().includes("to") &&
       (actionDescription.toLowerCase().includes("task") ||
        actionDescription.toLowerCase().includes("card")))
    );

    if (isTaskMoveRequest) {
      // Extract task and target column from the description
      const taskMatch = actionDescription.match(/move\s+(?:the\s+)?(?:task|card)\s+["']?([^"']+)["']?\s+to\s+["']?([^"']+)["']?/i);

      if (taskMatch && taskMatch.length >= 3) {
        return await moveTaskViaAI(projectId, taskMatch[1], taskMatch[2]);
      }
    }

    // Check if this is a task deletion preview request
    const isTaskPreviewRequest = (
      actionDescription.toLowerCase().includes("preview delete task") ||
      actionDescription.toLowerCase().includes("preview delete the task") ||
      actionDescription.toLowerCase().includes("preview remove task") ||
      actionDescription.toLowerCase().includes("preview remove the task")
    );

    if (isTaskPreviewRequest) {
      // Extract task identifier from the description
      const taskMatch = actionDescription.match(/preview\s+(?:delete|remove)\s+(?:the\s+)?(?:task|tasks)\s*:?\s*["']?([^"']+)["']?/i);

      if (taskMatch && taskMatch.length >= 2) {
        const taskIdentifier = taskMatch[1];

        // Check if this is a domain-specific request
        const isDomainSpecific = (
          taskIdentifier.includes("related") ||
          taskIdentifier.includes("stuff") ||
          taskIdentifier.includes("things") ||
          taskIdentifier.includes("all") ||
          taskIdentifier.includes("everything")
        );

        // If we're previewing useless tasks
        if (taskIdentifier.toLowerCase().includes("useless")) {
          return await previewUselessTasksViaAI(projectId);
        } else if (isDomainSpecific) {
          // If we're previewing domain-specific tasks
          return await previewDomainSpecificTasksViaAI(projectId, taskIdentifier);
        } else {
          // If we're previewing a specific task
          return await previewTaskDeletionViaAI(projectId, taskIdentifier);
        }
      }
    }

    // Check if this is a task deletion request
    const isTaskDeletionRequest = (
      actionDescription.toLowerCase().includes("delete task") ||
      actionDescription.toLowerCase().includes("delete the task") ||
      actionDescription.toLowerCase().includes("remove task") ||
      actionDescription.toLowerCase().includes("remove the task") ||
      actionDescription.toLowerCase().includes("delete useless task") ||
      actionDescription.toLowerCase().includes("delete useless tasks")
    );

    if (isTaskDeletionRequest) {
      // Extract task identifier from the description
      const taskMatch = actionDescription.match(/(?:delete|remove)\s+(?:the\s+)?(?:task|tasks)\s*:?\s*["']?([^"']+)["']?/i);

      if (taskMatch && taskMatch.length >= 2) {
        return await deleteTaskViaAI(projectId, taskMatch[1]);
      } else {
        // If no specific task is mentioned, assume we're deleting useless tasks
        return await deleteUselessTasksViaAI(projectId);
      }
    }

    // Check if this is a column deletion request
    const isColumnDeletionRequest = (
      actionDescription.toLowerCase().includes("delete column") ||
      actionDescription.toLowerCase().includes("delete the column") ||
      actionDescription.toLowerCase().includes("remove column") ||
      actionDescription.toLowerCase().includes("remove the column")
    );

    if (isColumnDeletionRequest) {
      // Extract column identifier from the description
      const columnMatch = actionDescription.match(/(?:delete|remove)\s+(?:the\s+)?column\s*:?\s*["']?([^"']+)["']?/i);

      if (columnMatch && columnMatch.length >= 2) {
        return await deleteColumnViaAI(projectId, columnMatch[1]);
      }
    }

    // Check if this is a request to add solutions to tasks
    const isAddSolutionsRequest = (
      actionDescription.toLowerCase().includes("add solution") ||
      actionDescription.toLowerCase().includes("add solutions") ||
      actionDescription.toLowerCase().includes("provide solution") ||
      actionDescription.toLowerCase().includes("provide solutions") ||
      actionDescription.toLowerCase().includes("update tasks with solution") ||
      actionDescription.toLowerCase().includes("edit tasks to provide solution") ||
      actionDescription.toLowerCase().includes("edit the tasks to provide solution")
    );

    if (isAddSolutionsRequest) {
      return await updateAllTasksWithSolutions(projectId);
    }

    // Get project info for context
    const projectInfo = await getProjectInfo(projectId);

    // Run the agent with the action description and project context
    const response = await runAgent(
      projectId,
      `For the project "${projectInfo.project.name}", please perform the following action: ${actionDescription}. Be specific to this project and its current state.`
    );

    // Ensure we have a valid response
    const finalResponse = typeof response === 'string' && response.trim() ?
      response :
      "I've processed your request successfully.";

    return { success: true, message: finalResponse };
  } catch (error) {
    console.error("Failed to perform AI action:", error);
    return { error: "Failed to perform AI action" };
  }
}
