/**
 * AI Agent API Route
 * This file implements the API route for the AI agent
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { runAgent } from "@/lib/ai/agent";

/**
 * POST: Process a message with the AI agent
 */
export async function POST(request: Request) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the request body
    const { projectId, message } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Run the agent
    const response = await runAgent(projectId, message);

    // Return the response
    return NextResponse.json({
      message: response,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error processing message with agent:", error);
    
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
