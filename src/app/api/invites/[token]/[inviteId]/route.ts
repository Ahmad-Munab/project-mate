import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Cancel an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: { inviteId: string } }
) {
  try {
    console.log(`API: Cancelling invite ${params.inviteId}`);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('API: Authentication error or no user found');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the invite
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, params.inviteId));

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Check if user is project owner or manager
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, invite.projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: "You don't have permission to cancel invites" },
        { status: 403 }
      );
    }

    // Delete the invite
    await db
      .delete(invites)
      .where(eq(invites.id, params.inviteId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling invite:", error);
    return NextResponse.json(
      { error: "Failed to cancel invite" },
      { status: 500 }
    );
  }
}

// Resend an invite
export async function POST(
  request: NextRequest,
  { params }: { params: { inviteId: string } }
) {
  try {
    console.log(`API: Resending invite ${params.inviteId}`);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('API: Authentication error or no user found');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the invite
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, params.inviteId));

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Check if user is project owner or manager
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, invite.projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: "You don't have permission to resend invites" },
        { status: 403 }
      );
    }

    // Update the invite with a new timestamp
    await db
      .update(invites)
      .set({ 
        updatedAt: new Date(),
        // Reset expiration date (7 days from now)
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      .where(eq(invites.id, params.inviteId));

    // TODO: Send email notification if email is present

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resending invite:", error);
    return NextResponse.json(
      { error: "Failed to resend invite" },
      { status: 500 }
    );
  }
}
