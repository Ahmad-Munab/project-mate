/**
 * AI Agent implementation using LangChain
 */

import { ChatGroq } from "@langchain/groq";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { BufferMemory } from "langchain/memory";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getEnhancedProjectContext, storeEnhancedMessage } from "./memory/enhanced";
import { getRecentMessages } from "./memory";
import { getProjectTools } from "./langchain-tools";
import { ActionType } from "./action-detector";

/**
 * Configuration for the LangChain agent
 */
const agentConfig = {
  model: "llama3-70b-8192",
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Create a LangChain model
 * @returns A LangChain model
 */
function createModel() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: agentConfig.model,
    temperature: agentConfig.temperature,
    maxTokens: agentConfig.maxTokens,
  });
}

/**
 * Create a LangChain agent for a project
 * @param projectId - The ID of the project
 * @returns A LangChain agent executor
 */
async function createProjectAgent(projectId: string) {
  try {
    // Get project context
    const projectContext = await getEnhancedProjectContext(projectId, "");

    // Get project tools
    const tools = getProjectTools(projectId);

    // Create the model
    const model = createModel();

    // Create the system message
    const systemMessage = new SystemMessage(`
You are Mate, an intelligent AI assistant for project management.
You help users manage their projects by creating and organizing tasks, providing insights, and taking actions.

${projectContext ? `Project Context:\n${projectContext}\n\n` : ""}

You have access to tools that allow you to:
- Create, update, and delete tasks
- Create, update, and delete columns (task statuses)
- Move tasks between columns
- Get information about the project and its tasks
- Generate suggestions, summaries, and analyses

Be proactive, helpful, and focused on delivering value to the user.
Use the most appropriate tool for each request.
    `.trim());

    // Create the agent
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      systemMessage,
    });

    // Create the executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      returnIntermediateSteps: true,
    });

    return agentExecutor;
  } catch (error) {
    console.error("Failed to create project agent:", error);
    throw error;
  }
}

// Process a user message and generate a response
export async function processUserMessage(projectId: string, userMessage: string) {
  try {
    // Check for simple greetings and respond concisely
    const simpleGreeting = isSimpleGreeting(userMessage);
    if (simpleGreeting && userMessage.split(' ').length <= 2) {
      return getSimpleGreetingResponse(simpleGreeting);
    }

    // First, try to detect actions proactively
    const detectedAction = await detectAction(projectId, userMessage);

    // If an action was detected with reasonable confidence, handle it
    if (detectedAction && detectedAction.confidence >= 0.6) { // Even lower threshold to be more proactive
      // For actions that need confirmation, return a confirmation message
      if (detectedAction.needsConfirmation) {
        return detectedAction.confirmationMessage ||
          `I'll ${getActionDescription(detectedAction.type)}. Just to confirm, is that what you want me to do?`;
      }

      // Special handling for project structure requests
      if (detectedAction.type === ActionType.CREATE_COLUMN &&
          userMessage.toLowerCase().includes("project structure")) {
        // Set specific parameters for project structure
        detectedAction.parameters.name = "Project Structure";
        detectedAction.parameters.color = "purple";
        return `I'll create a Project Structure column to help organize things better.`;
      }

      // Get response template for the action
      const responseTemplate = getActionResponseTemplate(detectedAction.type, detectedAction.parameters);

      // If we have a template, use it; otherwise continue with normal processing
      if (responseTemplate) {
        return responseTemplate;
      }
    }

    // Check for traditional tool actions (backward compatibility)
    const toolAction = await detectToolAction(projectId, userMessage);
    if (toolAction) {
      return toolAction;
    }

    // Get more recent messages for better context (increased from 10 to 15)
    const recentMessages = await getRecentMessages(projectId, 15);

    // Get the system message with enhanced context
    const systemMessage = await getEnhancedProjectContext(projectId, userMessage);

    // Add a context-specific instruction based on the most recent messages
    let contextualInstruction = "";

    // Check if this is a follow-up to a previous message
    if (recentMessages.length > 0) {
      // Get the last few user messages for better context
      const userMessages = recentMessages.filter(msg => msg.role === "user").slice(-3);
      const aiMessages = recentMessages.filter(msg => msg.role === "assistant").slice(-3);

      // Create a conversation summary
      let conversationSummary = "";
      for (let i = 0; i < Math.max(userMessages.length, aiMessages.length); i++) {
        if (userMessages[i]) {
          conversationSummary += `User: "${userMessages[i].content}"\n`;
        }
        if (aiMessages[i]) {
          conversationSummary += `You: "${aiMessages[i].content}"\n`;
        }
      }

      // Add the current message
      conversationSummary += `User: "${userMessage}"\n`;

      contextualInstruction = getContextualInstructionTemplate(conversationSummary, userMessage);
    }

    // Prepare messages for the AI
    // Call Groq API with conversation history
    const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
      { role: "system", content: systemMessage }
    ];

    // Add contextual instruction if available
    if (contextualInstruction) {
      messages.push({ role: "system", content: contextualInstruction });
    }

    // Add recent conversation context
    recentMessages.forEach(msg => {
      if (msg.role === "user" || msg.role === "assistant" || msg.role === "system") {
        messages.push({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content
        });
      }
    });

    // Add the current user message
    messages.push({ role: "user", content: userMessage });

    // Call Groq API with conversation history
    const completion = await groq.chat.completions.create({
      messages,
      model: "llama3-70b-8192",
      temperature: 0.75, // Balanced temperature for intelligence and creativity
      max_tokens: 800, // Longer responses for more detailed answers
      top_p: 0.95,
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Process the response to ensure it's directly addressing the user's question
    const processedResponse = processAIResponse(userMessage, aiResponse, recentMessages);

    // Store the message in the enhanced memory
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: processedResponse,
        timestamp: new Date(),
      }
    );

    return processedResponse;
  } catch (error) {
    console.error("Failed to process user message:", error);
    throw error;
  }
}

/**
 * Process the AI response to ensure it's directly addressing the user's question
 * @param userMessage - The user's message
 * @param aiResponse - The AI's response
 * @param recentMessages - Recent conversation messages
 * @returns The processed response
 */
function processAIResponse(userMessage: string, aiResponse: string, recentMessages: Array<{role: string, content: string}>): string {
  // Use recent messages to check for context continuity
  const lastUserMessages = recentMessages
    .filter(msg => msg.role === "user")
    .map(msg => msg.content)
    .slice(-3);

  const lastAiMessages = recentMessages
    .filter(msg => msg.role === "assistant")
    .map(msg => msg.content)
    .slice(-3);

  // For very short responses or questions, don't process
  if (aiResponse.length < 100 || userMessage.length < 5) {
    return aiResponse;
  }

  // Extract key concepts from the user's message
  const userMessageWords = userMessage
    .toLowerCase()
    .replace(/[.,?!;:()\[\]{}'"-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !['what', 'when', 'where', 'which', 'who', 'why', 'how', 'the', 'and', 'but', 'for', 'with'].includes(word));

  // Check if the response is directly addressing the user's question
  const userQuestionLower = userMessage.toLowerCase();
  const aiResponseLower = aiResponse.toLowerCase();

  // Check for common patterns of irrelevant responses
  const isGenericResponse = (
    (aiResponseLower.includes("i understand") && aiResponseLower.includes("let me")) ||
    (aiResponseLower.startsWith("i'd be happy to") || aiResponseLower.startsWith("i would be happy to")) ||
    (aiResponseLower.startsWith("i can help") && aiResponseLower.length > 300) ||
    (aiResponseLower.includes("is there anything else") && aiResponseLower.length > 300)
  );

  // Check if the response is too verbose for a simple question
  const isSimpleQuestion = (
    userQuestionLower.includes("why") ||
    userQuestionLower.includes("how") ||
    userQuestionLower.includes("what") ||
    userQuestionLower.includes("when") ||
    userQuestionLower.includes("where") ||
    userQuestionLower.includes("who")
  ) && userMessage.length < 50;

  const isTooVerbose = isSimpleQuestion && aiResponse.length > 300;

  // Check if the response is maintaining context from previous messages
  const isContextDisconnected = lastUserMessages.length > 0 &&
    !lastUserMessages.some(msg => {
      // Check if any keywords from previous messages are in the response
      const keywords = msg.split(' ')
        .filter(word => word.length > 4)
        .map(word => word.toLowerCase());
      return keywords.some(keyword => aiResponseLower.includes(keyword));
    });

  // Check if the response is repeating information from previous responses
  const isRepetitive = lastAiMessages.some(msg => {
    const similarity = calculateSimilarity(msg, aiResponse);
    return similarity > 0.7; // If more than 70% similar, consider it repetitive
  });

  // Check if the response is addressing the user's actual question
  const isAddressingQuestion = userMessageWords.some(word =>
    aiResponseLower.includes(word)
  );

  // If the response seems irrelevant, too verbose, disconnected from context, or repetitive, try to fix it
  if (isGenericResponse || isTooVerbose || isContextDisconnected || isRepetitive || !isAddressingQuestion) {
    // Extract the most relevant part of the response
    const sentences = aiResponse.split(/(?<=[.!?])\s+/);

    // For simple questions, just return the first 2-3 sentences
    if (isSimpleQuestion) {
      return sentences.slice(0, 3).join(' ');
    }

    // For generic responses, try to find the most relevant part
    const relevantSentences = sentences.filter(sentence => {
      const sentenceLower = sentence.toLowerCase();
      // Look for sentences that contain keywords from the user's message
      return userMessageWords.some(word => sentenceLower.includes(word));
    });

    if (relevantSentences.length > 0) {
      // If we found relevant sentences, use them
      return relevantSentences.join(' ');
    } else if (isRepetitive) {
      // If the response is repetitive, try to extract a different part
      const firstFewSentences = sentences.slice(0, 3).join(' ');
      const lastFewSentences = sentences.slice(-3).join(' ');

      // Use the part that's less similar to previous responses
      const firstSimilarity = Math.max(...lastAiMessages.map(msg => calculateSimilarity(msg, firstFewSentences)));
      const lastSimilarity = Math.max(...lastAiMessages.map(msg => calculateSimilarity(msg, lastFewSentences)));

      return firstSimilarity < lastSimilarity ? firstFewSentences : lastFewSentences;
    }
  }

  // If we couldn't improve the response, return it as is
  return aiResponse;
}

/**
 * Calculate the similarity between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  // Convert to lowercase and remove punctuation
  const text1 = str1.toLowerCase().replace(/[.,?!;:()\[\]{}'"-]/g, '');
  const text2 = str2.toLowerCase().replace(/[.,?!;:()\[\]{}'"-]/g, '');

  // Split into words
  const words1 = text1.split(/\s+/).filter(word => word.length > 3);
  const words2 = text2.split(/\s+/).filter(word => word.length > 3);

  // Count common words
  const commonWords = words1.filter(word => words2.includes(word));

  // Calculate Jaccard similarity
  const uniqueWords = new Set([...words1, ...words2]);

  return commonWords.length / uniqueWords.size;
}

/**
 * Detects if a user message should trigger a specific tool action
 * @param projectId - The ID of the project
 * @param userMessage - The user's message
 * @returns A response if a tool action was detected, null otherwise
 */
async function detectToolAction(projectId: string, userMessage: string) {
  const message = userMessage.toLowerCase();

  try {
    // Get all tasks
    const allTasks = await getProjectTasks(projectId);

    // Get tasks by status
    if (message.includes('show tasks in') || message.includes('list tasks in') ||
        message.includes('tasks in the') || message.includes('what tasks are in')) {
      // Extract status
      let status = '';
      if (message.includes('backlog')) status = 'BACKLOG';
      else if (message.includes('todo')) status = 'TODO';
      else if (message.includes('in progress')) status = 'IN_PROGRESS';
      else if (message.includes('done')) status = 'DONE';

      if (status) {
        const tasks = allTasks.filter(task => task.status === status);
        if (tasks.length === 0) {
          return `There are no tasks in ${status}.`;
        }

        return `Here are the tasks in ${status}:\n\n${tasks.map(task => {
          const desc = task.description || '';
          return `- **${task.title}** (Priority: ${task.priority})\n  ${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}`;
        }).join('\n\n')}`;
      }
    }

    // Get tasks by priority
    if (message.includes('priority tasks') || message.includes('high priority') ||
        message.includes('urgent tasks') || message.includes('low priority')) {
      // Extract priority
      let priority = '';
      if (message.includes('high priority')) priority = 'HIGH';
      else if (message.includes('urgent')) priority = 'URGENT';
      else if (message.includes('medium priority')) priority = 'MEDIUM';
      else if (message.includes('low priority')) priority = 'LOW';

      if (priority) {
        const tasks = allTasks.filter(task => task.priority === priority);
        if (tasks.length === 0) {
          return `There are no ${priority} priority tasks.`;
        }

        return `Here are the ${priority} priority tasks:\n\n${tasks.map(task => {
          const desc = task.description || '';
          return `- **${task.title}** (Status: ${task.status})\n  ${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}`;
        }).join('\n\n')}`;
      }
    }

    // Get project stats
    if (message.includes('project stats') || message.includes('project statistics') ||
        message.includes('project progress') || message.includes('how is the project going')) {
      // Calculate statistics
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(task => task.status === 'DONE').length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Count tasks by status
      const tasksByStatus: Record<string, number> = {};
      const statuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'];
      statuses.forEach(status => {
        tasksByStatus[status] = allTasks.filter(task => task.status === status).length;
      });

      // Count tasks by priority
      const tasksByPriority = {
        LOW: allTasks.filter(task => task.priority === 'LOW').length,
        MEDIUM: allTasks.filter(task => task.priority === 'MEDIUM').length,
        HIGH: allTasks.filter(task => task.priority === 'HIGH').length,
        URGENT: allTasks.filter(task => task.priority === 'URGENT').length,
      };

      return `**Project Statistics**\n\nTotal Tasks: ${totalTasks}\nCompleted Tasks: ${completedTasks}\nCompletion Rate: ${completionRate.toFixed(1)}%\n\n**Tasks by Status**\n${Object.entries(tasksByStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n')}\n\n**Tasks by Priority**\n- Low: ${tasksByPriority.LOW}\n- Medium: ${tasksByPriority.MEDIUM}\n- High: ${tasksByPriority.HIGH}\n- Urgent: ${tasksByPriority.URGENT}`;
    }

    // Get tasks due soon
    if (message.includes('due soon') || message.includes('upcoming deadlines') ||
        message.includes('tasks due this week')) {
      // Extract days
      let days = 7; // Default to 7 days
      const daysMatch = message.match(/(\d+)\s+days?/);
      if (daysMatch) {
        days = parseInt(daysMatch[1]);
      }

      // Calculate the date range
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + days);

      // Filter tasks due within the date range
      const tasks = allTasks.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= now && dueDate <= future;
      });

      if (tasks.length === 0) {
        return `There are no tasks due in the next ${days} days.`;
      }

      return `Here are the tasks due in the next ${days} days:\n\n${tasks.map(task => {
        // Safely handle due date
        const dueDateStr = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date';
        return `- **${task.title}** (Due: ${dueDateStr})\n  Status: ${task.status}, Priority: ${task.priority}`;
      }).join('\n\n')}`;
    }

    // Get overdue tasks
    if (message.includes('overdue') || message.includes('late tasks') ||
        message.includes('missed deadlines')) {
      // Calculate the current date
      const now = new Date();

      // Filter tasks that are overdue
      const tasks = allTasks.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate < now && task.status !== 'DONE';
      });

      if (tasks.length === 0) {
        return `There are no overdue tasks. Great job!`;
      }

      return `Here are the overdue tasks:\n\n${tasks.map(task => {
        // Safely handle due date
        const dueDateStr = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date';
        return `- **${task.title}** (Due: ${dueDateStr})\n  Status: ${task.status}, Priority: ${task.priority}`;
      }).join('\n\n')}`;
    }

    // List all tasks
    if (message.includes('list all tasks') || message.includes('show all tasks') ||
        message.includes('what tasks do we have')) {
      if (allTasks.length === 0) {
        return `There are no tasks in this project yet.`;
      }

      return `Here are all tasks in the project:\n\n${allTasks.map(task => {
        const desc = task.description || '';
        return `- **${task.title}** (Status: ${task.status}, Priority: ${task.priority})\n  ${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}`;
      }).join('\n\n')}`;
    }

    // No tool action detected
    return null;
  } catch (error) {
    console.error('Error in detectToolAction:', error);
    return null; // Fall back to normal processing
  }
}

// Run the project agent with a user message
export async function runProjectAgent(
  projectId: string,
  userMessage: string
) {
  try {
    // Store the user message
    await storeEnhancedMessage(
      projectId,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }
    );

    // Process the user message
    const aiResponse = await processUserMessage(projectId, userMessage);

    // Store the assistant message
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      }
    );

    return aiResponse;
  } catch (error) {
    console.error("Failed to run project agent:", error);

    // Store the error message
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
    );

    throw error;
  }
}
