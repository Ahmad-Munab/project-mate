export type Role = 'OWNER' | 'MANAGER' | 'MEMBER';

export interface Permissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageProject: boolean;
  canInvite: boolean;
  canApprove: boolean;
  canDeleteProject: boolean;
}

export interface UserPermissions extends Permissions {
  role: Role;
  userId: string;
}