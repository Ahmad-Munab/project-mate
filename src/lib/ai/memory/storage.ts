/**
 * Storage functions for AI memory
 */

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { aiSuggestions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AIMessage } from "./types";

// Store a message in the database
export async function storeMessage(
  projectId: string,
  message: AIMessage,
  taskId?: string
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Store the message in the database
    await db.insert(aiSuggestions).values({
      projectId,
      taskId,
      type: message.role,
      content: message.content,
    });

    return true;
  } catch (error) {
    console.error("Failed to store AI message:", error);
    return false;
  }
}

// Get recent messages for a project
export async function getRecentMessages(
  projectId: string,
  limit: number = 10
): Promise<AIMessage[]> {
  try {
    // Get messages from the database
    const messages = await db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.projectId, projectId))
      .orderBy({ createdAt: 'desc' })
      .limit(limit);

    // Convert to AIMessage format
    return messages.map((message) => ({
      role: message.type as "user" | "assistant" | "system",
      content: message.content,
      timestamp: new Date(message.createdAt || Date.now()),
    })).reverse();
  } catch (error) {
    console.error("Failed to get AI messages:", error);
    return [];
  }
}
