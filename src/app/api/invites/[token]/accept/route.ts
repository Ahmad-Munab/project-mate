import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites, users, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = params.token;
    console.log("Processing invite acceptance for token:", token);

    // Find and validate invite
    const [invite] = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.token, token),
          eq(invites.status, "PENDING")
        )
      );

    if (!invite) {
      console.log("No pending invite found for token:", token);
      return NextResponse.json(
        { error: "Invalid or expired invite" },
        { status: 400 }
      );
    }

    console.log("Found invite:", invite); // Add this log

    if (!invite.projectId) {
      console.log("Missing projectId in invite");
      return NextResponse.json(
        { error: "Invalid invite: missing project" },
        { status: 400 }
      );
    }

    // Only verify email match if the invite has an email
    if (invite.email && user.email !== invite.email) {
      console.log("Email mismatch:", user.email, invite.email);
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 400 }
      );
    }

    // Check if invite is expired
    if (new Date() > invite.expiresAt) {
      console.log("Invite expired:", invite.expiresAt);
      await db
        .update(invites)
        .set({ status: "EXPIRED" })
        .where(eq(invites.id, invite.id));

      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Begin transaction
    await db.transaction(async (tx) => {
      // Update or create user
      let [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, user.id));

      if (existingUser) {
        await tx
          .update(users)
          .set({ 
            email: user.email,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));
      } else {
        await tx
          .insert(users)
          .values({
            id: user.id,
            email: user.email,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }

      // Add user to project members with the invited role
      const memberData = {
        id: randomUUID(),
        userId: user.id,
        projectId: invite.projectId,
        role: invite.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log("Inserting project member:", memberData); // Add this log

      await tx
        .insert(projectMembers)
        .values(memberData)
        .onConflictDoNothing({ 
          target: [projectMembers.userId, projectMembers.projectId] 
        });

      // If there was a conflict, update the existing record
      const [existingMember] = await tx
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.userId, user.id),
            eq(projectMembers.projectId, invite.projectId)
          )
        );

      if (existingMember) {
        await tx
          .update(projectMembers)
          .set({ 
            role: invite.role,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(projectMembers.userId, user.id),
              eq(projectMembers.projectId, invite.projectId)
            )
          );
      }

      // Update invite status
      await tx
        .update(invites)
        .set({ 
          status: "APPROVED",
          acceptedAt: new Date(),
          email: user.email,
          updatedAt: new Date()
        })
        .where(eq(invites.id, invite.id));
    });

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      projectId: invite.projectId // Return projectId for redirect
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    console.error("Error details:", error.detail); // Add more error details
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}
