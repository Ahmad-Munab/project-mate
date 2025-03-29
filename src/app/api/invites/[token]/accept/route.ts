import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { assignUserPermissions } from "@/services/permissions";

export async function POST(request: Request) {
    try {
        // Extract token from URL
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/");
        const token = pathParts[pathParts.length - 2]; // token is the second-to-last part
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // Token is already extracted from context.params
        console.log("Processing invite acceptance for token:", token);

        // Find and validate invite
        const [invite] = await db
            .select()
            .from(invites)
            .where(
                and(eq(invites.token, token), eq(invites.status, "PENDING"))
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
                {
                    error: "This invitation was sent to a different email address",
                },
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
            // 'tx' is the transaction object, which allows us to perform database operations
            // within a single transaction. This ensures that all operations either succeed
            // together or fail together, maintaining data consistency.

            // Add user to project members with the invited role
            const memberData = {
                id: randomUUID(),
                userId: user.id,
                projectId: invite.projectId,
                role: invite.role,

                createdAt: new Date(),
                updatedAt: new Date(),
            };

            console.log("Inserting project member:", memberData);

            await tx
                .insert(projectMembers)
                .values(memberData)
                .onConflictDoNothing({
                    target: [projectMembers.userId, projectMembers.projectId],
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

                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(projectMembers.userId, user.id),
                            eq(projectMembers.projectId, invite.projectId)
                        )
                    );
            }

            // Assign correct permissions based on role
            console.log(
                `Assigning permissions for user ${user.id} with role ${invite.role}`
            );
            await assignUserPermissions(user.id, invite.role);
            console.log(
                `Permissions assigned successfully for role ${invite.role}`
            );

            // Update invite status
            await tx
                .update(invites)
                .set({
                    status: "APPROVED",
                    acceptedAt: new Date(),
                    email: user.email,
                    updatedAt: new Date(),
                })
                .where(eq(invites.id, invite.id));
        });

        return NextResponse.json({
            success: true,
            message: "Invitation accepted successfully",
            projectId: invite.projectId, // Return projectId for redirect
        });
    } catch (error) {
        console.error("Detailed error accepting invite:", error);
        // Log additional error details if available
        if (error && typeof error === "object" && "code" in error)
            console.error("Error code:", error.code);
        if (error && typeof error === "object" && "detail" in error)
            console.error("Error detail:", error.detail);

        return NextResponse.json(
            {
                error: "Failed to accept invite",
                details:
                    error && typeof error === "object" && "message" in error
                        ? error.message
                        : "Unknown error",
            },
            { status: 500 }
        );
    }
}
