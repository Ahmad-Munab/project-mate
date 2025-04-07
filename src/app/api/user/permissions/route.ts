import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the project ID from the URL
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      // Return default permissions when no project is specified
      return NextResponse.json({
        createProjects: true,
        role: null,
        viewProjects: true,
      });
    }

    // Get the user's role in this project
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.id)
        )
      );

    // Define permissions based on role
    const role = membership?.role || null;
    const isOwner = role === 'OWNER';
    const isManager = role === 'MANAGER' || isOwner;
    const isMember = role === 'MEMBER' || isManager;

    const permissions = {
      role,
      // Project permissions
      viewProject: isMember,
      editProject: isManager,
      deleteProject: isOwner,
      
      // Task permissions
      createTasks: isMember,
      editTasks: isMember,
      deleteTasks: isManager,
      
      // Member permissions
      inviteMembers: isManager,
      removeMembers: isManager,
      changeRoles: isOwner,
    };

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}
