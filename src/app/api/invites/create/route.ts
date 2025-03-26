import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites, projects } from "@/db/schema";
import { generateInviteToken, generateExpirationDate } from "@/utils/token";
import { sendInviteEmail } from "@/services/email";
import { permissionsMiddleware } from "@/middleware/permissions";

export async function POST(request: Request) {
  try {
    // Check if user can invite
    const permissionError = await permissionsMiddleware(request, ["canInvite"]);
    if (permissionError) return permissionError;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get request body
    const { email, role, projectId } = await request.json();

    if (!email || !role || !projectId) {
      return NextResponse.json(
        { error: "Email, role, and projectId are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["MEMBER", "MANAGER", "OWNER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Generate invite token and expiration
    const token = generateInviteToken();
    const expiresAt = generateExpirationDate();

    // Create invite record
    const [invite] = await db
      .insert(invites)
      .values({
        email,
        token,
        role,
        projectId,
        status: "PENDING",
        createdBy: user.id,
        expiresAt,
      })
      .returning();

    if (!invite) {
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    // Send invite email
    await sendInviteEmail({
      email,
      role,
      inviteUrl,
      projectName: project.name,
    });

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
