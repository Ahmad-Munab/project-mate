/**
 * Optimized AI API Route
 * This file implements an optimized API route for the AI assistant
 * with better performance, error handling, and response times
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { runTieredAgent } from "@/lib/ai/agent/tiered-agent";
import { storeOptimizedMessage } from "@/lib/ai/memory/optimized-memory";
import { fixTaskResponses } from "@/lib/ai/middleware/fix-task-responses";
import { fixColumnRequests } from "@/lib/ai/middleware/fix-column-requests";

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

    // Use the optimized agent implementation
    try {
      // Store user message
      await storeOptimizedMessage(
        projectId,
        {
          role: "user",
          content: message,
          timestamp: new Date(),
        }
      );

      // Run the agent
      const agentResponse = await runTieredAgent(projectId, message);

      // Ensure we have a valid response
      let finalResponse = typeof agentResponse === 'string' && agentResponse.trim() ?
        agentResponse :
        "I've processed your request, but I don't have a detailed response to provide at this moment.";

      // Apply middleware to fix task responses
      finalResponse = fixTaskResponses(finalResponse);

      // Apply middleware to fix column creation requests
      finalResponse = fixColumnRequests(finalResponse);

      // Return response
      return NextResponse.json({
        message: finalResponse,
        timestamp: new Date(),
        agent: true,
        optimized: true
      });
    } catch (agentError) {
      console.error("Error using optimized agent:", agentError);

      // Check if it's a rate limit error
      const errorMessage = agentError instanceof Error ? agentError.message : String(agentError);
      if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
        return NextResponse.json({
          message: "I'm currently experiencing high demand. Please try again in a moment.",
          timestamp: new Date(),
          error: true,
          rateLimit: true
        }, { status: 429 });
      }

      // Return a fallback error message
      return NextResponse.json({
        message: "I'm sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date(),
        error: true
      });
    }
  } catch (error) {
    console.error("Optimized AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
