import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { nanoid } from 'nanoid';
import { sendInviteEmail } from "@/services/email";

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

    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const validRoles = ["MEMBER", "MANAGER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Generate a unique token
    const token = nanoid();

    // Store the invite in your database
    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        token,
        email,
        role,
        created_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Generate the invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    // Get the project name (you might need to adjust this based on your data structure)
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .single();

    const projectName = project?.name || 'Our Project';

    // Send the invite email with all required parameters
    await sendInviteEmail({
      email,
      role,
      inviteUrl,
      projectName,
    });

    return NextResponse.json({ invite });
  } catch (error) {
    console.error('Error sending invite:', error);
    return NextResponse.json(
      { error: "Failed to send invite" },
      { status: 500 }
    );
  }
}
