import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites, projectMembers, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Get invite details
export async function GET(request: NextRequest) {
  // const supabase = await createClient(); // Not needed in this route

  try {
    // Extract token from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const token = pathParts[pathParts.length - 1];

    // First, get the invite details
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, token));

    if (!invite) {
      console.log("No invite found for token:", token);
      return NextResponse.json(
        { error: "Invalid invite" },
        { status: 404 }
      );
    }

    // Check if invite is expired
    if (new Date() > invite.expiresAt) {
      console.log("Invite expired:", invite.expiresAt);
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 400 }
      );
    }

    // If there's a projectId, get the project details
    let projectName = null;
    if (invite.projectId) {
      const [project] = await db
        .select({
          name: projects.name,
        })
        .from(projects)
        .where(eq(projects.id, invite.projectId));

      if (project) {
        projectName = project.name;
      }
    }

    // Ensure role is uppercase
    const role = invite.role.toUpperCase();

    return NextResponse.json({
      role: role,
      projectName: projectName,
      projectId: invite.projectId,
      status: invite.status,
      email: invite.email,
    });

  } catch (error) {
    console.error("Error in invite GET route:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite details" },
      { status: 500 }
    );
  }
}

// Cancel an invite
export async function DELETE(request: NextRequest) {
  try {
    // Extract token from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const token = pathParts[pathParts.length - 1];
    console.log(`API: Cancelling invite with token ${token}`);
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
      .where(eq(invites.token, token));

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
      .where(eq(invites.token, token));

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
export async function POST(request: NextRequest) {
  try {
    // Extract token from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const token = pathParts[pathParts.length - 1];
    console.log(`API: Resending invite with token ${token}`);
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
      .where(eq(invites.token, token));

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
      .where(eq(invites.token, token));

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
