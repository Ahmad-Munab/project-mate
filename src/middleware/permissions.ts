import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserPermissions } from "@/services/permissions";
import type { Permissions } from "@/types/permissions";

export async function permissionsMiddleware(
  request: NextRequest,
  requiredPermissions: (keyof Permissions)[]
) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const permissions = await getUserPermissions(user.id);

  if (!permissions) {
    return NextResponse.json(
      { error: "No permissions found" },
      { status: 403 }
    );
  }

  const hasAllPermissions = requiredPermissions.every(
    (permission) => permissions[permission]
  );

  if (!hasAllPermissions) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return null; // Continue with the request
}