import { db } from "@/db";
import { permissions } from "@/db/schema";
import type { Role, Permissions } from "@/types/permissions";

const rolePermissions: Record<Role, Permissions> = {
  OWNER: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canManageProject: true,
    canInvite: true,
    canApprove: true,
    canDeleteProject: true,
  },
  MANAGER: {
    canView: true,
    canEdit: true,
    canDelete: false,
    canManageProject: true,
    canInvite: true,
    canApprove: false,
    canDeleteProject: false,
  },
  MEMBER: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canManageProject: false,
    canInvite: false,
    canApprove: false,
    canDeleteProject: false,
  },
};

export async function assignUserPermissions(userId: string, role: string) {
  try {
    // First, remove any existing permissions
    await db
      .delete(permissions)
      .where(eq(permissions.userId, userId));

    // Get the permissions for this role
    const rolePermissions = getRolePermissions(role);

    // Insert new permissions
    if (rolePermissions.length > 0) {
      await db
        .insert(permissions)
        .values(
          rolePermissions.map(permission => ({
            userId,
            permission,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
    }
  } catch (error) {
    console.error(`Error assigning permissions to user ${userId}:`, error);
    throw error;
  }
}

export async function getUserPermissions(userId: string): Promise<Permissions | null> {
  const [userPerms] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.userId, userId));
    
  return userPerms || null;
}

export function hasPermission(userPerms: Permissions, permission: keyof Permissions): boolean {
  return userPerms[permission] === true;
}
