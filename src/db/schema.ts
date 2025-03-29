import {
    pgTable,
    uuid,
    text,
    timestamp,
    pgEnum,
    pgSchema,
    uniqueIndex,
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

export const authUsers = authSchema.table("users", {
    id: uuid("id").primaryKey(),
});

export const projects = pgTable("projects", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    readme: text("readme"),
    ownerId: uuid("owner_id")
        .references(() => authUsers.id)
        .notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});

export const projectMembers = pgTable(
    "project_members",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .references(() => authUsers.id)
            .notNull(),
        projectId: uuid("project_id")
            .references(() => projects.id)
            .notNull(),
        role: userRoleEnum("role").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        uniqueMembership: uniqueIndex("unique_project_membership").on(
            table.userId,
            table.projectId
        ),
    })
);

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

// Invites table
export const invites = pgTable("invites", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email"),
    token: text("token").notNull(),
    role: userRoleEnum("role").notNull(),
    status: inviteStatusEnum("status").notNull().default("PENDING"),
    projectId: uuid("project_id")
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
