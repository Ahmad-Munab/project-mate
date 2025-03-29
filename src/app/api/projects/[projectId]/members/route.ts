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
    // In Next.js 15, params should be awaited
    const { projectId } = await params;
    console.log(`API: Fetching members for project ${projectId}`);
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
        status: projectMembers.status,
        lastActive: projectMembers.lastActive,
        createdAt: projectMembers.createdAt,
        updatedAt: projectMembers.updatedAt,
        email: users.email,
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    console.log(`API: Found ${members.length} members for project ${projectId}`);

    // Get Supabase user profiles for additional info
    const userIds = members.map(member => member.userId);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, last_sign_in_at')
      .in('id', userIds);

    // Map profiles to members
    const membersWithProfiles = members.map(member => {
      const profile = profiles?.find(p => p.id === member.userId);

      // Format last active time
      let lastActiveTime = 'Never';
      if (member.lastActive) {
        lastActiveTime = new Date(member.lastActive).toLocaleString();
      } else if (profile?.last_sign_in_at) {
        lastActiveTime = new Date(profile.last_sign_in_at).toLocaleString();

        // Update the lastActive field in the database if it's not set
        if (!member.lastActive) {
          db.update(projectMembers)
            .set({ lastActive: new Date(profile.last_sign_in_at) })
            .where(eq(projectMembers.id, member.id))
            .execute()
            .catch(err => console.error('Failed to update lastActive:', err));
        }
      }

      return {
        ...member,
        name: profile?.full_name || member.email?.split('@')[0] || 'Unknown User',
        avatar: profile?.avatar_url || '',
        lastActive: lastActiveTime,
        // Convert status to lowercase for frontend consistency
        status: member.status?.toLowerCase() || 'pending',
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
  context: { params: { projectId: string } }
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

    // Get projectId from context
    const { projectId } = context.params;

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
        { error: "You don't have permission to update member roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, role, status } = body;

    if (!memberId || (!role && !status)) {
      return NextResponse.json(
        { error: "Member ID and either role or status are required" },
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
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, 'OWNER')
        )
      );

    if (memberToUpdate.userId === project?.userId) {
      return NextResponse.json(
        { error: "Cannot change the role of the project owner" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Add role to update if provided
    if (role) {
      updateData.role = role;
    }

    // Add status to update if provided
    if (status) {
      updateData.status = status;

      // If activating a member, update their lastActive time
      if (status.toUpperCase() === 'ACTIVE') {
        updateData.lastActive = new Date();
      }
    }

    // Update the member
    await db
      .update(projectMembers)
      .set(updateData)
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
  context: { params: { projectId: string } }
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

    // Get projectId from context
    const { projectId } = context.params;

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
          eq(projectMembers.projectId, projectId),
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
