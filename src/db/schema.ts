import {
    pgTable,
    uuid,
    text,
    timestamp,
    pgEnum,
    pgSchema,
    uniqueIndex,
    boolean,
    integer
} from "drizzle-orm/pg-core";

// User roles for project membership
export const userRoleEnum = pgEnum("user_role", ["OWNER", "MANAGER", "MEMBER"]);
/**
 * Task status enum - LEGACY
 *
 * IMPORTANT: This enum is kept for backward compatibility only.
 * New code should use the dynamic projectTaskStatuses table and status_key field instead.
 * The system supports any valid status key, not just these enum values.
 */
export const taskStatusEnum = pgEnum("task_status", [
    "BACKLOG",
    "TODO",
    "IN_PROGRESS",
    "DONE",
]);

/**
 * Task priority levels
 *
 * Note: While defined as an enum for database type safety,
 * the application uses the priorityConfig from dynamic-defaults.ts
 * to determine available priority levels and their properties.
 */
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

// Auth users from Supabase auth schema
export const authUsers = authSchema.table("users", {
    id: uuid("id").primaryKey(),
    metadata: text("raw_user_meta_data").$type<UserMetadata>(),
});

// User profiles table
export const profiles = pgTable("profiles", {
    id: uuid("id").primaryKey().references(() => authUsers.id),
    full_name: text("full_name"),
    email: text("email").notNull(),
    avatar_url: text("avatar_url"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});

// Main projects table
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

// Project members with roles (junction table)
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

// Custom task statuses for each project (kanban columns)
export const projectTaskStatuses = pgTable(
    "project_task_statuses",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        project_id: uuid("project_id")
            .references(() => projects.id)
            .notNull(),
        name: text("name").notNull(),
        key: text("key").notNull(), // Unique identifier (e.g., "BACKLOG", "TODO")
        color: text("color").notNull().default("bg-gray-50 dark:bg-gray-900"), // CSS color class
        is_default: boolean("is_default").notNull().default(false), // Protected status flag
        order: integer("order").notNull(), // Display order
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

// Project tasks with status and priority
export const tasks = pgTable("tasks", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("BACKLOG"), // Legacy enum field - kept for backward compatibility
    status_key: text("status_key"), // Reference to projectTaskStatuses.key - this is the preferred field to use
    priority: priorityLevelEnum("priority").notNull().default("MEDIUM"),
    project_id: uuid("project_id")
        .references(() => projects.id)
        .notNull(),
    created_by: uuid("created_by")
        .references(() => authUsers.id)
        .notNull(),
    created_at: timestamp("created_at").defaultNow(),
    due_date: timestamp("due_date"),
    tech_icon: text("tech_icon"), // Legacy field - kept for backward compatibility
    tech_icons: text("tech_icons"), // JSON array of Simple-icons slugs for technology icons
});

// Task assignees junction table
export const taskAssignees = pgTable("task_assignees", {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
        .references(() => tasks.id)
        .notNull(),
    userId: uuid("user_id")
        .references(() => authUsers.id)
        .notNull(),
});

// AI-generated suggestions for projects and tasks
export const aiSuggestions = pgTable("ai_suggestions", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
        .references(() => projects.id)
        .notNull(),
    taskId: uuid("task_id").references(() => tasks.id),
    type: text("type").notNull(), // Suggestion type (e.g., 'task', 'solution')
    content: text("content").notNull(), // Suggestion content
    createdAt: timestamp("created_at").defaultNow(),
});

// Project invitations for new members
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


// Note: We're using the messages table for AI conversation history
// AI conversation messages table
export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
        .references(() => projects.id)
        .notNull(),
    task_id: uuid("task_id")
        .references(() => tasks.id),
    role: text("role").notNull(), // 'user', 'assistant', or 'system'
    content: text("content").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    created_by: uuid("created_by")
        .references(() => authUsers.id),
});