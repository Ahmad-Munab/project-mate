/**
 * Fix Task Responses Middleware
 * This middleware intercepts AI responses that contain task creation requests
 * and ensures they are properly formatted
 */

/**
 * Fix AI responses that contain task creation requests
 * @param message - The AI's response message
 * @returns The fixed message with proper tool calls
 */
export function fixTaskResponses(message: string): string {
  // Check if the message already contains a properly formatted tool call
  if (message.includes("<tool>create_task</tool><parameters>{") &&
      message.includes('"title":')) {
    console.log("Message already contains properly formatted task creation tool call");
    return message;
  }

  // Check for task creation intent
  const taskCreationPatterns = [
    /create.*task/i,
    /add.*task/i,
    /new task/i,
    /create.*item/i,
    /add.*item/i,
    /new item/i
  ];

  const hasTaskCreationIntent = taskCreationPatterns.some(pattern => pattern.test(message));

  if (!hasTaskCreationIntent) {
    return message;
  }

  // Extract task title from the message
  const titlePatterns = [
    /create.*task.*["']([^"']+)["']/i,
    /add.*task.*["']([^"']+)["']/i,
    /create.*item.*["']([^"']+)["']/i,
    /add.*item.*["']([^"']+)["']/i,
    /create.*task.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /add.*task.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /create.*item.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /add.*item.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /task.*for\s+(\w[^,.!?]+)/i,
    /item.*for\s+(\w[^,.!?]+)/i
  ];

  let taskTitle = "";
  for (const pattern of titlePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      taskTitle = match[1].trim();
      break;
    }
  }

  if (!taskTitle) {
    console.log("Could not extract task title from message");
    return message;
  }

  console.log(`Extracted task title: ${taskTitle}`);

  // Extract description from the message
  let description = "";
  const descriptionMatch = message.match(/description:?\s*["']([^"']+)["']/i) ||
                          message.match(/description:?\s*(\w[^,.!?]+)/i);

  if (descriptionMatch && descriptionMatch[1]) {
    description = descriptionMatch[1].trim();
  } else {
    // Use a generic description
    description = `Task created by AI assistant: ${taskTitle}`;
  }

  // Extract priority from the message
  const priorityPatterns = [
    /priority:?\s*["']([^"']+)["']/i,
    /priority:?\s*(\w+)/i,
    /(\w+)\s+priority/i
  ];

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  let priority = "MEDIUM";

  for (const pattern of priorityPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const potentialPriority = match[1].trim().toUpperCase();
      if (validPriorities.includes(potentialPriority)) {
        priority = potentialPriority;
        break;
      }
    }
  }

  // Create the tool call
  const toolCall = `<tool>create_task</tool><parameters>{"title":"${taskTitle}","description":"${description}","priority":"${priority}"}</parameters>`;

  // Check if the message already contains a malformed tool call
  if (message.includes("<tool>create_task</tool>")) {
    // Replace the malformed tool call with the correct one
    return message.replace(new RegExp('<tool>create_task</tool>\\s*<parameters>.*?</parameters>', 'i'), toolCall);
  }

  // Otherwise, append the tool call to the message
  return `${message}\n\n${toolCall}`;
}
