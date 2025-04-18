/**
 * AI Chat API Route
 * This file implements a simplified API route for the AI chat
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { runAgent } from "@/lib/ai/agent";

export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get request body
    const { message, projectId } = await request.json();

    if (!message || !projectId) {
      return NextResponse.json(
        { error: "Message and projectId are required" },
        { status: 400 }
      );
    }

    // Use the agent implementation
    try {
      const agentResponse = await runAgent(projectId, message);

      // Return response
      return NextResponse.json({
        message: agentResponse,
        timestamp: new Date(),
        agent: true
      });
    } catch (agentError) {
      console.error("Error using agent:", agentError);

      // Return a fallback error message
      return NextResponse.json({
        message: "I'm sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date(),
        error: true
      });
    }
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
