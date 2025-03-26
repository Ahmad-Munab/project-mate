import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { nanoid } from 'nanoid';
import { sendInviteEmail } from "@/services/email";
import { db } from "@/db";
import { invites, projects } from "@/db/schema";
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    console.log('🚀 Starting invite process...');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { email, role, projectId } = await request.json();
    console.log('📧 Invite details:', { email, role, projectId });

    if (!email || !projectId) {
      console.error('❌ Missing required fields:', { email, projectId });
      return NextResponse.json(
        { error: "Email and projectId are required" },
        { status: 400 }
      );
    }

    const validRoles = ["MEMBER", "MANAGER"];
    if (!validRoles.includes(role)) {
      console.error('❌ Invalid role:', role);
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Get project details
    console.log('🔍 Fetching project details for ID:', projectId);
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      console.error('❌ Project not found:', projectId);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    console.log('✅ Project found:', project.name);

    // Generate a unique token
    const token = nanoid();
    console.log('🔑 Generated invite token:', token);

    // Store the invite in the database
    console.log('💾 Creating invite record...');
    const [invite] = await db
      .insert(invites)
      .values({
        token,
        email,
        role,
        projectId,
        status: "PENDING",
        createdBy: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!invite) {
      console.error('❌ Failed to create invite record');
      throw new Error("Failed to create invite");
    }
    console.log('✅ Invite record created:', invite);

    // Generate the invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${token}`;
    console.log('🔗 Generated invite URL:', inviteUrl);
    console.log('📨 Attempting to send email with RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Present' : '❌ Missing');

    // Send the invite email
    try {
      const emailResult = await sendInviteEmail({
        email,
        role,
        inviteUrl,
        projectName: project.name,
      });
      console.log('✅ Email sent successfully:', emailResult);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      // Continue execution even if email fails
    }

    return NextResponse.json({ invite });
  } catch (error) {
    console.error('❌ Error in invite process:', error);
    return NextResponse.json(
      { 
        error: "Failed to send invite",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
