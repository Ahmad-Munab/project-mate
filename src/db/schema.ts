import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  pgSchema,
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
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => authUsers.id)
    .notNull(),
  role: userRoleEnum("role").notNull().default("MEMBER"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("BACKLOG"),
  priority: priorityLevelEnum("priority").notNull().default("MEDIUM"),
  project_id: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  created_by: uuid("created_by")
    .references(() => authUsers.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow(),
  due_date: timestamp("due_date"),
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
  createdAt: timestamp("created_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Invites table
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  role: userRoleEnum("role").notNull().default("MEMBER"),
  status: inviteStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdBy: uuid("created_by")
    .references(() => authUsers.id)
    .notNull(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: userRoleEnum("role").notNull().unique(),
  canView: boolean("can_view").notNull().default(true),
  canEdit: boolean("can_edit").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
  canManageProject: boolean("can_manage_project").notNull().default(false),
  canInvite: boolean("can_invite").notNull().default(false),
  canApprove: boolean("can_approve").notNull().default(false),
  canDeleteProject: boolean("can_delete_project").notNull().default(false),
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
