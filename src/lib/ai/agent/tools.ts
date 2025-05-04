/**
 * Agent Tools
 * This file implements the tools that the agent can use
 * following proper agent architecture patterns
 */

// Import the getAllTools function from the tools module
import { getAllTools } from '../tools';

/**
 * Get all tools for a project
 * @param projectId - The ID of the project
 * @returns An array of all available tools
 */
export function getAgentTools(projectId: string) {
  // Use the centralized getAllTools function from the tools module
  return getAllTools(projectId);
}
