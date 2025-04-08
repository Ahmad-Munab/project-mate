import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { storeEnhancedMessage, type AIMessage } from "@/lib/ai/enhanced-memory";
import { runProjectAgent } from "@/lib/ai/agent";



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

    // Run the agent with the user message
    const aiResponse = await runProjectAgent(projectId, message);

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
