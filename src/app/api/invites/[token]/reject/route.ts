import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    await db
      .update(invites)
      .set({ status: "REJECTED" })
      .where(eq(invites.token, token));

    return NextResponse.json({
      success: true,
      message: "Invite rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting invite:", error);
    return NextResponse.json(
      { error: "Failed to reject invite" },
      { status: 500 }
    );
  }
}