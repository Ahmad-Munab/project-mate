import { db } from "@/db";
import { permissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Permissions } from "@/types/permissions";

// Define valid role types
type RoleType = 'MEMBER' | 'MANAGER' | 'OWNER';

export async function assignUserPermissions(userId: string, role: string) {
  try {
    console.log(`Permission Service: Assigning permissions for user ${userId} with role ${role}`);

    // First, remove any existing permissions
    console.log(`Permission Service: Removing existing permissions for user ${userId}`);
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

    const upperRole = role.toUpperCase() as RoleType;
    console.log(`Permission Service: Looking up permissions for role ${upperRole}`);

    // Type guard to ensure the role is valid
    const isValidRole = (role: string): role is RoleType => {
      return ['MEMBER', 'MANAGER', 'OWNER'].includes(role);
    };

    if (!isValidRole(upperRole)) {
      console.error(`Permission Service: Invalid role: ${role}`);
      throw new Error(`Invalid role: ${role}`);
    }

    const perms = rolePermissions[upperRole];

    console.log(`Permission Service: Found permissions for role ${upperRole}:`, perms);

    // Insert new permissions
    const permissionsToInsert = {
      userId,
      role: upperRole, // Ensure role is stored in uppercase
      ...perms,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`Permission Service: Inserting permissions:`, permissionsToInsert);
    await db
      .insert(permissions)
      .values(permissionsToInsert);

  } catch (error) {
    console.error(`Error assigning permissions to user ${userId}:`, error);
    throw error;
  }
}

export async function getUserPermissions(userId: string): Promise<Permissions | null> {
  console.log(`Permission Service: Getting permissions for user ${userId}`);

  const [userPerms] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.userId, userId));

  console.log(`Permission Service: Found permissions for user ${userId}:`, userPerms || 'none');

  if (!userPerms) return null;

  // Map database permissions to Permissions interface
  const mappedPermissions: Permissions = {
    canView: true, // Basic permission everyone has
    canEdit: userPerms.role === 'MANAGER' || userPerms.role === 'OWNER',
    canDelete: userPerms.role === 'MANAGER' || userPerms.role === 'OWNER',
    canManageProject: userPerms.role === 'MANAGER' || userPerms.role === 'OWNER',
    canInvite: userPerms.canInviteUsers,
    canApprove: userPerms.role === 'MANAGER' || userPerms.role === 'OWNER',
    canDeleteProject: userPerms.canDeleteProjects
  };

  return mappedPermissions;
}

export function hasPermission(userPerms: Permissions, permission: keyof Permissions): boolean {
  return userPerms[permission] === true;
}
