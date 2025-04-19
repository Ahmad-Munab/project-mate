import {
    pgTable,
    uuid,
    text,
    timestamp,
    pgEnum,
    pgSchema,
    uniqueIndex,
    boolean,
    integer,
    jsonb,
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

export type UserMetadata = {
    email: string;
    full_name?: string;
    avatar_url?: string;
};

export const authUsers = authSchema.table("users", {
    id: uuid("id").primaryKey(),
    metadata: text("raw_user_meta_data").$type<UserMetadata>(),
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

// Project task statuses table to store custom statuses for each project
export const projectTaskStatuses = pgTable(
    "project_task_statuses",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        project_id: uuid("project_id")
            .references(() => projects.id)
            .notNull(),
        name: text("name").notNull(),
        key: text("key").notNull(), // A unique identifier for the status (e.g., "BACKLOG", "TODO")
        color: text("color").notNull().default("bg-gray-50 dark:bg-gray-900"), // CSS class for the column color
        is_default: boolean("is_default").notNull().default(false), // Whether this is a default status that can't be deleted
        order: integer("order").notNull(), // The order in which to display the status
        created_at: timestamp("created_at").defaultNow(),
        updated_at: timestamp("updated_at").defaultNow(),
    },
    (table) => ({
        projectTaskStatusUniqueKey: uniqueIndex("project_task_status_unique_key").on(
            table.project_id,
            table.key
        ),
    })
);

export const tasks = pgTable("tasks", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("BACKLOG"), // Keep using the enum for backward compatibility
    status_key: text("status_key"), // New field to store the custom status key
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

// AI messages table for storing conversation history
export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
        .references(() => projects.id)
        .notNull(),
    task_id: uuid("task_id").references(() => tasks.id),
    role: text("role").notNull(), // 'user', 'assistant', or 'system'
    content: text("content").notNull(),
    created_by: uuid("created_by").references(() => authUsers.id),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

// Custom vector type for pgvector extension
export const vector = () => {
    return text("embedding").$type<string>();
};

// AI embeddings table for vector search
export const aiEmbeddings = pgTable("ai_embeddings", {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
        .references(() => projects.id)
        .notNull(),
    task_id: uuid("task_id").references(() => tasks.id),
    content: text("content").notNull(),
    embedding: vector(), // Vector embedding
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at").defaultNow(),
});
