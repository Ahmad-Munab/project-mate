import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { type AIMessage } from "@/lib/ai";
import { processUserMessage, processConversation, detectAction, detectAndExecuteAction } from "@/lib/ai";
import { getRecentMessages } from "@/lib/ai";

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
    const { message, projectId, detectOnly, integrated, conversational } = await request.json();

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

    // If integrated is true, use the integrated approach
    if (integrated) {
      const integratedResponse = await detectAndExecuteAction(projectId, message);

      return NextResponse.json({
        message: integratedResponse,
        timestamp: new Date(),
        integrated: true
      });
    }

    // If conversational is true, use the conversational approach
    if (conversational) {
      // Get recent messages for context
      const recentMessages = await getRecentMessages(projectId, 10);

      // Process the conversation
      const conversationalResponse = await processConversation(projectId, message, recentMessages);

      return NextResponse.json({
        message: conversationalResponse,
        timestamp: new Date(),
        conversational: true
      });
    }

    // Run the multi-agent orchestrator with the user message
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
