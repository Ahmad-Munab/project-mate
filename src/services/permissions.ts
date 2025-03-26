import { db } from "@/db";
import { permissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Role, Permissions } from "@/types/permissions";

export async function assignUserPermissions(userId: string, role: string) {
  try {
    // First, remove any existing permissions
    await db
      .delete(permissions)
      .where(eq(permissions.userId, userId));

    // Define role-based permissions
    const rolePermissions = {
      MEMBER: {
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageProject: false,
        canInvite: false,
        canApprove: false,
        canDeleteProject: false,
      },
      MANAGER: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageProject: true,
        canInvite: true,
        canApprove: false,
        canDeleteProject: false,
      },
      OWNER: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageProject: true,
        canInvite: true,
        canApprove: true,
        canDeleteProject: true,
      }
    };

    const perms = rolePermissions[role.toUpperCase()];
    if (!perms) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Insert new permissions
    await db
      .insert(permissions)
      .values({
        userId,
        role,
        ...perms,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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
