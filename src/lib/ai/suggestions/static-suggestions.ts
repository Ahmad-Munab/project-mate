/**
 * Static Suggestions
 * This file provides static suggestions for the AI chat
 * to avoid unnecessary AI calls and prevent conflicts
 */

// Project-related suggestions
export const PROJECT_SUGGESTIONS = [
  "Create a task for implementing user authentication",
  "Add a new column for code review",
  "What tasks are currently in the backlog?",
  "Help me plan the next sprint",
  "Create tasks for setting up CI/CD pipeline",
  "What's the best way to implement this feature?",
  "Generate a list of tasks for this project",
  "How should I structure the database for this project?",
  "What technologies would you recommend for this project?",
  "Help me break down this feature into smaller tasks",
  "What are the best practices for implementing this?",
  "Create a task for adding unit tests",
  "What's the current status of this project?",
  "How can I improve the project architecture?",
  "What security considerations should I keep in mind?",
  "Create a task for implementing error handling",
  "What performance optimizations can I make?",
  "Help me prioritize the backlog tasks",
  "What documentation should I create for this project?",
  "Create a task for implementing responsive design"
];

// Get random suggestions from the list
export function getRandomSuggestions(count: number = 4): string[] {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...PROJECT_SUGGESTIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' elements
  return shuffled.slice(0, count);
}

// Get project-specific suggestions based on project type or name
export function getProjectSpecificSuggestions(
  projectName: string = "",
  projectDescription: string = "",
  count: number = 4
): string[] {
  const normalizedName = projectName.toLowerCase();
  const normalizedDescription = projectDescription.toLowerCase();
  
  // Check for specific project types in the name or description
  const isWebApp = 
    normalizedName.includes("web") || 
    normalizedDescription.includes("web") ||
    normalizedName.includes("website") || 
    normalizedDescription.includes("website") ||
    normalizedName.includes("app") || 
    normalizedDescription.includes("app");
    
  const isMobile = 
    normalizedName.includes("mobile") || 
    normalizedDescription.includes("mobile") ||
    normalizedName.includes("ios") || 
    normalizedDescription.includes("ios") ||
    normalizedName.includes("android") || 
    normalizedDescription.includes("android");
    
  const isBackend = 
    normalizedName.includes("api") || 
    normalizedDescription.includes("api") ||
    normalizedName.includes("server") || 
    normalizedDescription.includes("server") ||
    normalizedName.includes("backend") || 
    normalizedDescription.includes("backend");
    
  // Specific suggestions based on project type
  const specificSuggestions: string[] = [];
  
  if (isWebApp) {
    specificSuggestions.push(
      "Create a task for implementing responsive design",
      "What frontend framework would be best for this web app?",
      "Help me plan the UI/UX for this web application",
      "Create tasks for implementing client-side validation"
    );
  }
  
  if (isMobile) {
    specificSuggestions.push(
      "What's the best approach for state management in this mobile app?",
      "Create tasks for implementing offline functionality",
      "Help me plan the navigation flow for this mobile app",
      "What testing framework should I use for this mobile app?"
    );
  }
  
  if (isBackend) {
    specificSuggestions.push(
      "Create tasks for implementing API endpoints",
      "What's the best way to structure the database for this API?",
      "Help me plan the authentication system for this backend",
      "Create tasks for implementing data validation"
    );
  }
  
  // If we have enough specific suggestions, use them
  if (specificSuggestions.length >= count) {
    return specificSuggestions.slice(0, count);
  }
  
  // Otherwise, combine with random suggestions
  const randomSuggestions = getRandomSuggestions(count - specificSuggestions.length);
  return [...specificSuggestions, ...randomSuggestions];
}
