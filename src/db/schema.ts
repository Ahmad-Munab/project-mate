import {
  pgTable,
  uuid,
  text,
  timestamp,
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

// ProjectMembers table - stores information about users in projects
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

// Tasks table - stores task information
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

// TaskAssignees table - stores information about users assigned to tasks
export const taskAssignees = pgTable("task_assignees", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .references(() => tasks.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => authUsers.id)
    .notNull(),
});

// AiSuggestions table - stores AI-generated suggestions for tasks
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

// ProjectInvites table - stores information about project invitations
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
