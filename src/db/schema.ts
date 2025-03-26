import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  pgSchema,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["OWNER", "MANAGER", "MEMBER"]);
export const taskStatusEnum = pgEnum("task_status", [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
]);
export const priorityLevelEnum = pgEnum("priority_level", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);

const authSchema = pgSchema("auth");

const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  readme: text("readme"),
  closed: text("closed"),
  ownerId: uuid("owner_id")
    .references(() => authUsers.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueMembership: uniqueIndex("unique_project_membership").on(table.userId, table.projectId)
}));

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("BACKLOG"),
  priority: priorityLevelEnum("priority").notNull().default("MEDIUM"),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => authUsers.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
});

export const taskAssignees = pgTable("task_assignees", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .references(() => tasks.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => authUsers.id)
    .notNull(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  taskId: uuid("task_id").references(() => tasks.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectInvites = pgTable("project_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  code: text("code").notNull().unique(),
  role: userRoleEnum("role").notNull().default("MEMBER"),
  createdBy: uuid("created_by")
    .references(() => authUsers.id)
    .notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Invites table
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"), // Optional (nullable)
  token: text("token").notNull(),
  role: userRoleEnum("role").notNull(),
  status: inviteStatusEnum("status").notNull().default("PENDING"),
  projectId: uuid("project_id") // Add this field
    .references(() => projects.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdBy: uuid("created_by")
    .references(() => authUsers.id)
    .notNull(),
});

// Users table with role
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("MEMBER"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: userRoleEnum("role").notNull(),
  canCreateProjects: boolean("can_create_projects").notNull().default(false),
  canDeleteProjects: boolean("can_delete_projects").notNull().default(false),
  canInviteUsers: boolean("can_invite_users").notNull().default(false),
  canManageUsers: boolean("can_manage_users").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Role permissions mapping
export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: userRoleEnum("role").notNull(),
  permissionId: uuid("permission_id")
    .references(() => permissions.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User permissions table
export const userPermissions = pgTable("user_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  permissionId: uuid("permission_id")
    .references(() => permissions.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert default permissions
export const defaultPermissions = [
  {
    role: "OWNER",
    canView: true,
    canEdit: true,
    canDelete: true,
    canManageProject: true,
    canInvite: false, // Owner cannot invite new users
    canApprove: true,
    canDeleteProject: true,
  },
  {
    role: "MANAGER",
    canView: true,
    canEdit: true,
    canDelete: true,
    canManageProject: true,
    canInvite: true,
    canApprove: true,
    canDeleteProject: false,
  },
  {
    role: "MEMBER",
    canView: true,
    canEdit: false,
    canDelete: false,
    canManageProject: false,
    canInvite: false,
    canApprove: false,
    canDeleteProject: false,
  },
];
