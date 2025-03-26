import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { token } = await request.json();

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
      return NextResponse.json(
        { error: "Invalid or expired invite" },
        { status: 400 }
      );
    }

    // Check if invite is expired
    if (new Date() > invite.expiresAt) {
      await db
        .update(invites)
        .set({ status: "REJECTED" })
        .where(eq(invites.id, invite.id));

      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 400 }
      );
    }

    // Update invite status
    await db
      .update(invites)
      .set({ status: "APPROVED" })
      .where(eq(invites.id, invite.id));

    return NextResponse.json({
      success: true,
      message: "Invite accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}