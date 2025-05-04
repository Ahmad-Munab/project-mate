/**
 * Fix Column Requests Middleware
 * This middleware intercepts AI responses that contain column creation requests
 * and ensures they are properly formatted
 */

/**
 * Fix AI responses that contain column creation requests
 * @param message - The AI's response message
 * @returns The fixed message with proper tool calls
 */
export function fixColumnRequests(message: string): string {
  // Check if the message already contains a properly formatted tool call
  if (message.includes("<tool>create_column</tool><parameters>{") &&
      message.includes('"name":')) {
    console.log("Message already contains properly formatted column creation tool call");
    return message;
  }

  // Check for column creation intent
  const columnCreationPatterns = [
    /create.*column/i,
    /add.*column/i,
    /new column/i,
    /create.*status/i,
    /add.*status/i,
    /new status/i,
    /create.*stage/i,
    /add.*stage/i,
    /new stage/i,
    /code review/i,
    /review/i,
    /testing/i,
    /deployment/i,
    /planning/i,
    /development/i,
    /design/i
  ];

  const hasColumnCreationIntent = columnCreationPatterns.some(pattern => pattern.test(message));

  if (!hasColumnCreationIntent) {
    return message;
  }

  // Extract column name from the message
  const columnNamePatterns = [
    /create.*column.*["']([^"']+)["']/i,
    /add.*column.*["']([^"']+)["']/i,
    /create.*status.*["']([^"']+)["']/i,
    /add.*status.*["']([^"']+)["']/i,
    /create.*stage.*["']([^"']+)["']/i,
    /add.*stage.*["']([^"']+)["']/i,
    /create.*column.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /add.*column.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /create.*status.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /add.*status.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /create.*stage.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /add.*stage.*(?:called|named|titled)?\s+(\w[^,.!?]+)/i,
    /column.*for\s+(\w[^,.!?]+)/i,
    /status.*for\s+(\w[^,.!?]+)/i,
    /stage.*for\s+(\w[^,.!?]+)/i
  ];

  let columnName = "";
  for (const pattern of columnNamePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      columnName = match[1].trim();
      break;
    }
  }

  // If no column name was found but we have specific keywords, use them as column names
  if (!columnName) {
    const specificColumns = [
      { pattern: /code review/i, name: "Code Review" },
      { pattern: /review/i, name: "Review" },
      { pattern: /testing/i, name: "Testing" },
      { pattern: /deployment/i, name: "Deployment" },
      { pattern: /planning/i, name: "Planning" },
      { pattern: /development/i, name: "Development" },
      { pattern: /design/i, name: "Design" }
    ];

    for (const column of specificColumns) {
      if (column.pattern.test(message)) {
        columnName = column.name;
        break;
      }
    }
  }

  if (!columnName) {
    console.log("Could not extract column name from message");
    return message;
  }

  console.log(`Extracted column name: ${columnName}`);

  // Extract color from the message
  const colorPatterns = [
    /color.*["']([^"']+)["']/i,
    /color.*(\w+)/i,
    /(\w+).*color/i
  ];

  const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange'];
  let color = "";

  for (const pattern of colorPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const potentialColor = match[1].trim().toLowerCase();
      if (validColors.includes(potentialColor)) {
        color = potentialColor;
        break;
      }
    }
  }

  // Create the tool call
  const toolCall = `<tool>create_column</tool><parameters>{"name":"${columnName}"${color ? `,"color":"${color}"` : ''}}</parameters>`;

  // Check if the message already contains a malformed tool call
  if (message.includes("<tool>create_column</tool>")) {
    // Replace the malformed tool call with the correct one
    return message.replace(new RegExp('<tool>create_column</tool>\\s*<parameters>.*?</parameters>', 'i'), toolCall);
  }

  // Otherwise, append the tool call to the message
  return `${message}\n\n${toolCall}`;
}
