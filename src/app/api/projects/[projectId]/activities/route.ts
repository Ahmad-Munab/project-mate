import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectMembers, invites } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // In Next.js 15, params should be awaited
    const { projectId } = await params;
    console.log(`API: Fetching activities for project ${projectId}`);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('API: Authentication error or no user found');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is a member of the project
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    if (!membership) {
      return NextResponse.json(
        { error: "You don't have access to this project" },
        { status: 403 }
      );
    }

    // Get all members with their creation and update times
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(desc(projectMembers.updatedAt));

    // Get all invites for the project
    const projectInvites = await db
      .select()
      .from(invites)
      .where(eq(invites.projectId, projectId))
      .orderBy(desc(invites.updatedAt));

    // Get user profiles from Supabase
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url');

    // Create activities from members and invites
    const activities = [];

    // Member activities
    for (const member of members) {
      const profile = profiles?.find(p => p.id === member.userId);
      const name = profile?.full_name || 'Unknown User';
      const avatar = profile?.avatar_url || '';

      // Join activity
      activities.push({
        id: `join-${member.id}`,
        userId: member.userId,
        userName: name,
        userAvatar: avatar,
        action: "joined",
        target: "the project",
        timestamp: new Date(member.createdAt).toISOString(),
        type: "join"
      });

      // Status change activities (if status was updated after creation)
      if (member.updatedAt > member.createdAt) {
        activities.push({
          id: `status-${member.id}`,
          userId: member.userId,
          userName: name,
          userAvatar: avatar,
          action: "changed status to",
          target: member.status,
          timestamp: new Date(member.updatedAt).toISOString(),
          type: "status_change"
        });
      }

      // Last active activity
      if (member.lastActive) {
        activities.push({
          id: `active-${member.id}`,
          userId: member.userId,
          userName: name,
          userAvatar: avatar,
          action: "was last active",
          target: "",
          timestamp: new Date(member.lastActive).toISOString(),
          type: "active"
        });
      }
    }

    // Invite activities
    for (const invite of projectInvites) {
      // Find who created the invite
      const creator = members.find(m => m.userId === invite.createdBy);
      const creatorProfile = profiles?.find(p => p.id === invite.createdBy);
      const creatorName = creatorProfile?.full_name || 'Unknown User';
      const creatorAvatar = creatorProfile?.avatar_url || '';

      activities.push({
        id: `invite-${invite.id}`,
        userId: invite.createdBy,
        userName: creatorName,
        userAvatar: creatorAvatar,
        action: "invited",
        target: invite.email || "a new member",
        timestamp: new Date(invite.createdAt).toISOString(),
        type: "invite"
      });

      // Accepted invite activity
      if (invite.acceptedAt) {
        activities.push({
          id: `accept-${invite.id}`,
          userId: "system",
          userName: invite.email?.split('@')[0] || "New member",
          userAvatar: "",
          action: "accepted invitation",
          target: "",
          timestamp: new Date(invite.acceptedAt).toISOString(),
          type: "accept"
        });
      }
    }

    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Format timestamps to be more readable
    const formattedActivities = activities.map(activity => {
      const date = new Date(activity.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let formattedTime;
      if (diffSecs < 60) {
        formattedTime = `${diffSecs} seconds ago`;
      } else if (diffMins < 60) {
        formattedTime = `${diffMins} minutes ago`;
      } else if (diffHours < 24) {
        formattedTime = `${diffHours} hours ago`;
      } else if (diffDays < 7) {
        formattedTime = `${diffDays} days ago`;
      } else {
        formattedTime = date.toLocaleDateString();
      }

      return {
        ...activity,
        timestamp: formattedTime
      };
    });

    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error("Error fetching project activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
