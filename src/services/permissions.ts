import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Permissions } from "@/types/permissions";

export async function getUserPermissions(
    userId: string,
    projectId: string
): Promise<Permissions | null> {
    console.log(
        `Permission Service: Getting permissions for user ${userId} in project ${projectId}`
    );

    // Get user's role from project_members table
    const [membership] = await db
        .select()
        .from(projectMembers)
        .where(
            and(
                eq(projectMembers.userId, userId),
                eq(projectMembers.projectId, projectId)
            )
        );

    if (!membership) {
        console.log(
            `Permission Service: No membership found for user ${userId} in project ${projectId}`
        );
        return null;
    }

    console.log(
        `Permission Service: Found role ${membership.role} for user ${userId}`
    );

    // Map roles to permissions
    const rolePermissions: Record<string, Permissions> = {
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

    return rolePermissions[membership.role] || null;
}

export function hasPermission(
    userPerms: Permissions,
    permission: keyof Permissions
): boolean {
    return userPerms[permission] === true;
}
