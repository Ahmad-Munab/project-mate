import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites, projectMembers, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sendInviteEmail } from "@/services/email";
import type { Role } from "@/types/permissions";

export async function GET(
  request: NextRequest,
  context: { params: { projectId: string } }
) {
  try {
    // Get projectId from context.params
    const { projectId } = context.params;
    console.log(`API: Fetching invites for project ${projectId}`);
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
          eq(projectMembers.projectId, projectId),
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
          eq(invites.projectId, projectId),
          eq(invites.status, "PENDING")
        )
      );

    console.log(`API: Found ${pendingInvites.length} pending invites for project ${projectId}`);

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
  context: { params: { projectId: string } }
) {
  try {
    // Get projectId from context.params
    const { projectId } = context.params;
    console.log('🚀 Starting invite creation process...');
    console.log('📝 Project ID:', projectId);

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log('👤 User authenticated:', user.id);

    // Check if user is project owner or manager
    console.log('🔍 Checking user permissions...');
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership) {
      console.log('❌ User is not a member of this project');
      return NextResponse.json(
        { error: "You don't have permission to create invites" },
        { status: 403 }
      );
    }

    console.log('👑 User role in project:', membership.role);
    if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
      console.log('❌ User does not have sufficient permissions');
      return NextResponse.json(
        { error: "You don't have permission to create invites" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;
    console.log('📧 Invite details:', { email, role });

    if (!role || (role !== 'MEMBER' && role !== 'MANAGER')) {
      console.log('❌ Invalid role:', role);
      return NextResponse.json(
        { error: "Valid role is required (MEMBER or MANAGER)" },
        { status: 400 }
      );
    }

    // Get project details for email
    console.log('🔍 Fetching project details...');
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      console.log('❌ Project not found');
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    console.log('📋 Project found:', project.name);

    // Generate a unique token
    const token = randomUUID();
    console.log('🔑 Generated token:', token);

    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the invite
    console.log('💾 Creating invite record...');
    const [newInvite] = await db
      .insert(invites)
      .values({
        email: email || null,
        token,
        role,
        projectId: projectId,
        createdBy: user.id,
        status: 'PENDING',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('✅ Invite created successfully:', newInvite.id);

    // Send email if email is provided
    if (email) {
      try {
        console.log('📨 Attempting to send invitation email...');
        console.log('📝 Email configuration:', {
          RESEND_API_KEY_EXISTS: !!process.env.RESEND_API_KEY,
          SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
          EMAIL_FROM: process.env.EMAIL_FORM,
        });

        // Generate the invite URL
        const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${token}`;
        console.log('🔗 Invite URL:', inviteUrl);

        // Send the email
        const emailResult = await sendInviteEmail({
          email,
          role: role as Role,
          inviteUrl,
          projectName: project.name,
        });

        console.log('✅ Email sent successfully:', emailResult);
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError);
        // Continue execution even if email fails
      }
    } else {
      console.log('ℹ️ No email provided, skipping email send');
    }

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
    console.error("❌ Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite", details: error.message },
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
