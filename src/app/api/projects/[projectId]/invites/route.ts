import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`API: Fetching invites for project ${params.projectId}`);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('API: Authentication error or no user found');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is project owner or manager
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, params.projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: "You don't have permission to view invites" },
        { status: 403 }
      );
    }

    // Get all pending invites for the project
    const pendingInvites = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.projectId, params.projectId),
          eq(invites.status, "PENDING")
        )
      );

    console.log(`API: Found ${pendingInvites.length} pending invites for project ${params.projectId}`);

    // Format the invites for the frontend
    const formattedInvites = pendingInvites.map(invite => ({
      id: invite.id,
      email: invite.email || 'No email (link invite)',
      role: invite.role,
      sentAt: formatTimeAgo(invite.createdAt),
      status: invite.status,
      token: invite.token,
    }));

    return NextResponse.json(formattedInvites);
  } catch (error) {
    console.error("Error fetching project invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}

// Create a new invite
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is project owner or manager
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, params.projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: "You don't have permission to create invites" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!role || (role !== 'MEMBER' && role !== 'MANAGER')) {
      return NextResponse.json(
        { error: "Valid role is required (MEMBER or MANAGER)" },
        { status: 400 }
      );
    }

    // Generate a unique token
    const token = randomUUID();
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the invite
    const [newInvite] = await db
      .insert(invites)
      .values({
        email: email || null,
        token,
        role,
        projectId: params.projectId,
        createdBy: user.id,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ 
      success: true,
      invite: {
        id: newInvite.id,
        email: newInvite.email,
        token: newInvite.token,
        role: newInvite.role,
      }
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}
