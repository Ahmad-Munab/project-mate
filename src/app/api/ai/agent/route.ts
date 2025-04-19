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

    // Check if it's a rate limit error
    const errorStr = String(error);
    if (errorStr.includes('429') || errorStr.includes('rate_limit')) {
      return NextResponse.json(
        {
          message: "Rate limit reached. Please try again in a few minutes or use a shorter message.",
          timestamp: new Date(),
          error: true
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        message: "Failed to process message. Please try again.",
        timestamp: new Date(),
        error: true
      },
      { status: 500 }
    );
  }
}
