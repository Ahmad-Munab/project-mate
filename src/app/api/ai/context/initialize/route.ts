/**
 * API Route: Initialize Project Context
 * This endpoint initializes the project context for a specific project
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
// Import the necessary functions
import { storeEnhancedMessage } from "@/lib/ai";

/**
 * POST: Initialize project context
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

    // Get the project ID from the request
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Initialize the project context by storing a system message
    const success = await storeEnhancedMessage(
      projectId,
      {
        role: "system",
        content: "Project context initialized.",
        timestamp: new Date(),
      }
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to initialize project context" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project context initialized successfully",
    });
  } catch (error) {
    console.error("Error initializing project context:", error);

    return NextResponse.json(
      { error: "Failed to initialize project context" },
      { status: 500 }
    );
  }
}
