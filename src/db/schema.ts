import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

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

// Tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export type User = typeof users.$inferSelect;

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  aiOutline: text("ai_outline"), // Stores markdown
  ownerId: uuid("owner_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  role: userRoleEnum("role").notNull().default("MEMBER"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("BACKLOG"),
  priority: priorityLevelEnum("priority").default("MEDIUM"),
  dueDate: timestamp("due_date"),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  createdById: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskAssignees = pgTable("task_assignees", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .references(() => tasks.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  taskId: uuid("task_id").references(() => tasks.id),
  type: text("type").notNull(), // 'PROJECT_OUTLINE', 'TASK_SUGGESTION'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
