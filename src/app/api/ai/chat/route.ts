import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { type AIMessage } from "@/lib/ai/memory/types";
import { processUserMessage, detectAction } from "@/lib/ai";

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
    const { message, projectId, detectOnly } = await request.json();

    if (!message || !projectId) {
      return NextResponse.json(
        { error: "Message and projectId are required" },
        { status: 400 }
      );
    }

    // If detectOnly is true, just detect actions without running the full agent
    if (detectOnly) {
      const detectedAction = await detectAction(projectId, message);

      return NextResponse.json({
        detectedAction: detectedAction,
        timestamp: new Date(),
      });
    }

    // Run the agent with the user message
    const aiResponse = await processUserMessage(projectId, message);

    // Return response
    return NextResponse.json({
      message: aiResponse,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
