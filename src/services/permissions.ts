import { db } from "@/db";
import { permissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Permissions } from "@/types/permissions";

export async function assignUserPermissions(userId: string, role: string) {
    try {
        console.log(
            `Permission Service: Assigning permissions for user ${userId} with role ${role}`
        );

        // First, remove any existing permissions
        console.log(
            `Permission Service: Removing existing permissions for user ${userId}`
        );
        await db.delete(permissions).where(eq(permissions.userId, userId));

        // Define the role type
        type Role = "MEMBER" | "MANAGER" | "OWNER";

        // Define permissions interface
        interface RolePermissions {
            canView: boolean;
            canEdit: boolean;
            canDelete: boolean;
            canManageProject: boolean;
            canInvite: boolean;
            canApprove: boolean;
            canDeleteProject: boolean;
        }

        // Type the rolePermissions object
        const rolePermissions: Record<Role, RolePermissions> = {
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
            },
        };

        const upperRole = role.toUpperCase() as Role;
        const perms = rolePermissions[upperRole];
        if (!perms) {
            console.error(`Permission Service: Invalid role: ${role}`);
            throw new Error(`Invalid role: ${role}`);
        }

        console.log(
            `Permission Service: Found permissions for role ${upperRole}:`,
            perms
        );

        // Insert new permissions
        const permissionsToInsert = {
            userId,
            role: upperRole, // Ensure role is stored in uppercase
            ...perms,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        console.log(
            `Permission Service: Inserting permissions:`,
            permissionsToInsert
        );
        await db.insert(permissions).values(permissionsToInsert);
    } catch (error) {
        console.error(`Error assigning permissions to user ${userId}:`, error);
        throw error;
    }
}

export async function getUserPermissions(
    userId: string
): Promise<Permissions | null> {
    console.log(`Permission Service: Getting permissions for user ${userId}`);

    const [userPerms] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.userId, userId));

    console.log(
        `Permission Service: Found permissions for user ${userId}:`,
        userPerms || "none"
    );
    // Map database fields to Permissions interface
    if (!userPerms) return null;

    return {
        canView: true, // Default to true as per your permissions logic
        canEdit: userPerms.canManageUsers,
        canDelete: userPerms.canDeleteProjects,
        canManageProject: userPerms.canManageUsers,
        canInvite: userPerms.canInviteUsers,
        canApprove: userPerms.canManageUsers,
        canDeleteProject: userPerms.canDeleteProjects,
    };
}

export function hasPermission(
    userPerms: Permissions,
    permission: keyof Permissions
): boolean {
    return userPerms[permission] === true;
}
