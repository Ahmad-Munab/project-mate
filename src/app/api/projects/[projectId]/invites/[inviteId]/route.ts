import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; inviteId: string }> }
) {
    try {
        const { projectId, inviteId } = await params;
        console.log(`🗑️ Deleting invite ${inviteId} from project ${projectId}`);

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
                    eq(projectMembers.projectId, projectId),
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
            .where(eq(invites.id, inviteId));

        return NextResponse.json({
            success: true,
            message: "Invite cancelled successfully"
        });
    } catch (error) {
        console.error("Error cancelling invite:", error);
        return NextResponse.json(
            { error: "Failed to cancel invite" },
            { status: 500 }
        );
    }
}