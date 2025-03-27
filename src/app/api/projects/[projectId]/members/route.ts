import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`API: Fetching members for project ${params.projectId}`);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('API: Authentication error or no user found');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Join projectMembers with users to get email
    const members = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        projectId: projectMembers.projectId,
        role: projectMembers.role,
        createdAt: projectMembers.createdAt,
        updatedAt: projectMembers.updatedAt,
        email: users.email,
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, params.projectId));

    console.log(`API: Found ${members.length} members for project ${params.projectId}`);
    
    // Get Supabase user profiles for additional info
    const userIds = members.map(member => member.userId);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, last_sign_in_at')
      .in('id', userIds);
    
    // Map profiles to members
    const membersWithProfiles = members.map(member => {
      const profile = profiles?.find(p => p.id === member.userId);
      return {
        ...member,
        name: profile?.full_name || member.email?.split('@')[0] || 'Unknown User',
        avatar: profile?.avatar_url || '',
        lastActive: profile?.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleString() : 'Unknown',
        status: 'active', // Default status
      };
    });

    return NextResponse.json(membersWithProfiles);
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
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
          eq(projectMembers.projectId, params.projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: "You don't have permission to update member roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: "Member ID and role are required" },
        { status: 400 }
      );
    }

    // Don't allow changing the role of the project owner
    const [memberToUpdate] = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.id, memberId));

    if (!memberToUpdate) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Check if the target member is the project owner
    const [project] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, params.projectId),
          eq(projectMembers.role, 'OWNER')
        )
      );

    if (memberToUpdate.userId === project?.userId) {
      return NextResponse.json(
        { error: "Cannot change the role of the project owner" },
        { status: 403 }
      );
    }

    // Update the member's role
    await db
      .update(projectMembers)
      .set({ 
        role,
        updatedAt: new Date()
      })
      .where(eq(projectMembers.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

// Remove member from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
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
          eq(projectMembers.projectId, params.projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: "You don't have permission to remove members" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Don't allow removing the project owner
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

    // Check if the target member is the project owner
    const [project] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, params.projectId),
          eq(projectMembers.role, 'OWNER')
        )
      );

    if (memberToRemove.userId === project?.userId) {
      return NextResponse.json(
        { error: "Cannot remove the project owner" },
        { status: 403 }
      );
    }

    // Remove the member
    await db
      .delete(projectMembers)
      .where(eq(projectMembers.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
