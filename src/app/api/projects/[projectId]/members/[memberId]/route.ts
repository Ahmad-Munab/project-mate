import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { userRoleEnum } from "@/db/schema";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
    try {
        const { projectId, memberId } = await params;
        console.log(`🔄 Updating member ${memberId} in project ${projectId}`);

        // Authenticate user
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            console.log("❌ Authentication failed");
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check if user is project owner or manager
        const [requesterMembership] = await db
            .select()
            .from(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, projectId),
                    eq(projectMembers.userId, user.id)
                )
            );

        if (!requesterMembership) {
            console.log("❌ User is not a member of this project");
            return NextResponse.json(
                { error: "You don't have permission to update member roles" },
                { status: 403 }
            );
        }

        // Only owners and managers can update roles
        if (requesterMembership.role !== "OWNER" && requesterMembership.role !== "MANAGER") {
            console.log("❌ User does not have sufficient permissions");
            return NextResponse.json(
                { error: "You don't have permission to update member roles" },
                { status: 403 }
            );
        }

        // Get the body data
        const body = await request.json();
        const { role } = body;

        // Validate the role
        if (!role || !userRoleEnum.enumValues.includes(role as (typeof userRoleEnum.enumValues)[number])) {
            console.log("❌ Invalid role provided:", role);
            return NextResponse.json(
                { error: "Invalid role provided" },
                { status: 400 }
            );
        }

        // Get the member to update
        const [memberToUpdate] = await db
            .select()
            .from(projectMembers)
            .where(eq(projectMembers.id, memberId));

        if (!memberToUpdate) {
            console.log("❌ Member not found");
            return NextResponse.json(
                { error: "Member not found" },
                { status: 404 }
            );
        }

        // Don't allow changing the role of the project owner
        const [projectOwner] = await db
            .select()
            .from(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, projectId),
                    eq(projectMembers.role, "OWNER")
                )
            );

        if (memberToUpdate.userId === projectOwner?.userId) {
            console.log("❌ Cannot change the role of the project owner");
            return NextResponse.json(
                { error: "Cannot change the role of the project owner" },
                { status: 403 }
            );
        }

        // Managers can't modify other managers' roles
        if (
            requesterMembership.role === "MANAGER" &&
            memberToUpdate.role === "MANAGER"
        ) {
            console.log("❌ Managers cannot modify other managers' roles");
            return NextResponse.json(
                { error: "Managers cannot modify other managers' roles" },
                { status: 403 }
            );
        }

        // Managers can't promote members to managers
        if (
            requesterMembership.role === "MANAGER" &&
            role === "MANAGER"
        ) {
            console.log("❌ Managers cannot promote members to managers");
            return NextResponse.json(
                { error: "Managers cannot promote members to managers" },
                { status: 403 }
            );
        }

        // Update the member's role
        console.log(`📝 Updating member role to ${role}`);
        await db
            .update(projectMembers)
            .set({
                role: role as (typeof userRoleEnum.enumValues)[number],
                updatedAt: new Date(),
            })
            .where(eq(projectMembers.id, memberId));

        console.log("✅ Member role updated successfully");
        return NextResponse.json({
            success: true,
            message: "Member role updated successfully"
        });
    } catch (error) {
        console.error("❌ Error updating member role:", error);
        return NextResponse.json(
            { error: "Failed to update member role" },
            { status: 500 }
        );
    }
}

// Remove member from project
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
    try {
        const { projectId, memberId } = await params;
        console.log(`🗑️ Removing member ${memberId} from project ${projectId}`);

        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check if user is project owner or manager
        const [requesterMembership] = await db
            .select()
            .from(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, projectId),
                    eq(projectMembers.userId, user.id)
                )
            );

        if (
            !requesterMembership ||
            (requesterMembership.role !== "OWNER" && requesterMembership.role !== "MANAGER")
        ) {
            return NextResponse.json(
                { error: "You don't have permission to remove members" },
                { status: 403 }
            );
        }

        // Get the member to remove
        const [memberToRemove] = await db
            .select()
            .from(projectMembers)
            .where(eq(projectMembers.id, memberId));

        if (!memberToRemove) {
            return NextResponse.json(
                { error: "Member not found" },
                { status: 404 }
            );
        }

        // Don't allow removing the project owner
        const [projectOwner] = await db
            .select()
            .from(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, projectId),
                    eq(projectMembers.role, "OWNER")
                )
            );

        if (memberToRemove.userId === projectOwner?.userId) {
            return NextResponse.json(
                { error: "Cannot remove the project owner" },
                { status: 403 }
            );
        }

        // Managers can't remove other managers
        if (
            requesterMembership.role === "MANAGER" &&
            memberToRemove.role === "MANAGER"
        ) {
            return NextResponse.json(
                { error: "Managers cannot remove other managers" },
                { status: 403 }
            );
        }

        // Remove the member
        await db
            .delete(projectMembers)
            .where(eq(projectMembers.id, memberId));

        return NextResponse.json({
            success: true,
            message: "Member removed successfully"
        });
    } catch (error) {
        console.error("Error removing member:", error);
        return NextResponse.json(
            { error: "Failed to remove member" },
            { status: 500 }
        );
    }
}
