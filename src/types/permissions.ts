export type Role = "OWNER" | "MANAGER" | "MEMBER";

export interface Permissions {
    role: Role | null;

    // Project permissions
    viewProject?: boolean;
    editProject?: boolean;
    deleteProject?: boolean;

    // Task permissions
    createTasks?: boolean;
    editTasks?: boolean;
    deleteTasks?: boolean;

    // Member permissions
    inviteMembers?: boolean;
    removeMembers?: boolean;
    changeRoles?: boolean;

    // General permissions
    createProjects?: boolean;
    viewProjects?: boolean;

    // Legacy permissions (for backward compatibility)
    canView?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canManageProject?: boolean;
    canInvite?: boolean;
    canApprove?: boolean;
    canDeleteProject?: boolean;
}

export interface UserPermissions extends Permissions {
    userId: string;
}
