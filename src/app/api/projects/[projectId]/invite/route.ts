import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectInvites } from "@/db/schema";
import { nanoid } from 'nanoid';

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { role } = await request.json();
    const projectId = params.projectId;

    // Generate unique invitation code
    const code = nanoid(10);

    // Create invitation link that expires in 7 days
    const [invite] = await db.insert(projectInvites)
      .values({
        projectId,
        code,
        role,
        createdBy: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();

    return NextResponse.json({
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/join/${code}`,
      expires: invite.expiresAt,
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
}