import { NextResponse } from "next/server";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { nanoid } from "nanoid";
import { createClient } from "@/utils/supabase/server";

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

    const { role, projectId } = await request.json();

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const token = nanoid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const [invite] = await db
      .insert(invites)
      .values({
        token,
        role,
        projectId, // This matches the schema field name
        status: "PENDING",
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.id,
      })
      .returning();

    return NextResponse.json({ token: invite.token });
  } catch (error) {
    console.error("Error generating invite:", error);
    return NextResponse.json(
      { error: "Failed to generate invite" },
      { status: 500 }
    );
  }
}
