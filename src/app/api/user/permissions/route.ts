import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { permissions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching user permissions');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('API: Authentication error or no user found');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log('API: User authenticated, ID:', user.id);
    const [userPermissions] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.userId, user.id));

    console.log('API: User permissions found:', userPermissions || 'none');

    if (!userPermissions) {
      // Return default permissions for users without explicit permissions
      return NextResponse.json({
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageProject: false,
        canInvite: false,
        canApprove: false,
        canDeleteProject: false,
        role: 'MEMBER'
      });
    }

    return NextResponse.json(userPermissions);
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}