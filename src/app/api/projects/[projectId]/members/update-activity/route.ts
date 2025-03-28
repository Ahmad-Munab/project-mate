import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // In Next.js 15, params should be awaited
    const { projectId } = await params;
    console.log(`API: Updating activity for project ${projectId}`);
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('API: Authentication error or no user found');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Update the lastActive timestamp and set status to ACTIVE
    const result = await db
      .update(projectMembers)
      .set({ 
        lastActive: new Date(),
        status: 'ACTIVE',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    console.log(`API: Updated activity for user ${user.id} in project ${projectId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}
