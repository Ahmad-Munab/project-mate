import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { type AIMessage } from "@/lib/ai";
import { processUserMessage, processConversation } from "@/lib/ai/langchain/proper-multi-agent";

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

    // If detectOnly or integrated is true, use the proper multi-agent system
    if (detectOnly || integrated) {
      try {
        // Try to use the proper multi-agent system first
        const properMultiAgentResponse = await processUserMessage(projectId, message);

        return NextResponse.json({
          message: properMultiAgentResponse,
          timestamp: new Date(),
          properMultiAgent: true
        });
      } catch (properMultiAgentError) {
        console.error("Error using proper multi-agent system:", properMultiAgentError);

        // Use the new agent implementation as a fallback
        try {
          const { runAgent } = await import("@/lib/ai/agent");
          const agentResponse = await runAgent(projectId, message);

          return NextResponse.json({
            message: agentResponse,
            timestamp: new Date(),
            agent: true,
            fallback: true
          });
        } catch (agentError) {
          console.error("Error using agent:", agentError);

          // Return a fallback error message
          return NextResponse.json({
            message: "I'm sorry, I encountered an error while processing your message. Please try again.",
            timestamp: new Date(),
            error: true,
            fallback: true
          });
        }
      }
    }

    // If conversational is true, use the proper multi-agent system with context
    if (conversational) {
      // Get recent messages for context
      const { db } = await import("@/db");
      const { aiMessages } = await import("@/db/schema");
      const { desc, eq } = await import("drizzle-orm");

      const recentMessages = await db.query.aiMessages.findMany({
        where: eq(aiMessages.projectId, projectId),
        orderBy: [desc(aiMessages.timestamp)],
        limit: 10,
      });

      // Format the conversation history
      const conversationHistory = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      try {
        // Try to use the proper multi-agent conversation system first
        const properConversationResponse = await processConversation(projectId, message, conversationHistory);

        return NextResponse.json({
          message: properConversationResponse,
          timestamp: new Date(),
          conversational: true,
          properMultiAgent: true
        });
      } catch (properConversationError) {
        console.error("Error using proper multi-agent conversation system:", properConversationError);

        // Use the new agent implementation as a fallback
        try {
          const { runAgent } = await import("@/lib/ai/agent");
          const agentResponse = await runAgent(projectId, message);

          return NextResponse.json({
            message: agentResponse,
            timestamp: new Date(),
            conversational: true,
            agent: true,
            fallback: true
          });
        } catch (agentError) {
          console.error("Error using agent:", agentError);

          // Return a fallback error message
          return NextResponse.json({
            message: "I'm sorry, I encountered an error while processing your message. Please try again.",
            timestamp: new Date(),
            conversational: true,
            error: true,
            fallback: true
          });
        }
      }
    }

    // Use the new agent implementation as the default
    try {
      const { runAgent } = await import("@/lib/ai/agent");
      const agentResponse = await runAgent(projectId, message);

      // Return response
      return NextResponse.json({
        message: agentResponse,
        timestamp: new Date(),
        agent: true
      });
    } catch (agentError) {
      console.error("Error using agent as default:", agentError);

      // Return a fallback error message
      return NextResponse.json({
        message: "I'm sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date(),
        error: true,
        fallback: true
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
