/**
 * Enhanced Memory Module
 *
 * This module provides enhanced memory capabilities for the AI assistant,
 * allowing it to store and retrieve messages for projects.
 */

import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Message interface for enhanced memory
 */
export interface EnhancedMessage {
  role: string;
  content: string;
  timestamp: Date;
}

/**
 * Store an enhanced message in the database
 *
 * @param projectId - The ID of the project
 * @param message - The message to store
 * @returns The stored message
 */
export async function storeEnhancedMessage(
  projectId: string,
  message: EnhancedMessage
) {
  try {
    // Insert the message into the database
    const [storedMessage] = await db.insert(messages).values({
      project_id: projectId,
      role: message.role,
      content: message.content,
      created_at: message.timestamp,
    }).returning();

    return storedMessage;
  } catch (error) {
    console.error("Failed to store enhanced message:", error);
    return null;
  }
}

/**
 * Retrieve enhanced messages for a project
 *
 * @param projectId - The ID of the project
 * @param limit - The maximum number of messages to retrieve
 * @returns An array of enhanced messages
 */
export async function getEnhancedMessages(
  projectId: string,
  limit: number = 50
) {
  try {
    // Retrieve messages from the database
    const storedMessages = await db.select().from(messages)
      .where(eq(messages.project_id, projectId))
      .orderBy(messages.created_at)
      .limit(limit);

    // Convert to enhanced messages
    return storedMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
    }));
  } catch (error) {
    console.error("Failed to retrieve enhanced messages:", error);
    return [];
  }
}

/**
 * Clear enhanced messages for a project
 *
 * @param projectId - The ID of the project
 * @returns True if successful, false otherwise
 */
export async function clearEnhancedMessages(projectId: string) {
  try {
    // Delete messages from the database
    await db.delete(messages).where(eq(messages.project_id, projectId));
    return true;
  } catch (error) {
    console.error("Failed to clear enhanced messages:", error);
    return false;
  }
}
