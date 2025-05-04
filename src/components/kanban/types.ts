import { tasks } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

// Base task type from the database schema
type BaseTask = InferSelectModel<typeof tasks>;

// Extended task type with additional properties
export type Task = Omit<BaseTask, 'tech_icons'> & {
  // Extended properties for Trello-like functionality
  labels?: TaskLabel[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  comments?: Comment[];
  members?: Member[];
  // Override tech_icons to be either a string (from DB) or parsed string[] (in memory)
  tech_icons?: string | string[];
};

// Type for task status (column)
export type TaskStatus = {
  id: string;
  project_id: string;
  name: string;
  key: string;
  color: string;
  is_default: boolean;
  order: number;
  created_at: string;
  updated_at: string;
};

// Type for task label
export type TaskLabel = {
  id: string;
  name: string;
  color: string;
};

// Type for checklist item
export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

// Type for attachment
export type Attachment = {
  id: string;
  name: string;
  url: string;
  type: string; // file, link, etc.
  created_at: string;
};

// Type for comment
export type Comment = {
  id: string;
  text: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
};

// Type for member
export type Member = {
  id: string;
  name: string;
  avatar?: string;
};

// Import dynamic configuration
import { getColumnColor, priorityConfig } from "@/config/dynamic-defaults";

/**
 * Get a column color dynamically
 * @param key Column key or index
 * @returns A color class
 */
export function getColumnColorClass(key: string | number): string {
  return getColumnColor(key);
}

/**
 * Get a column name from its key
 * @param key Column key
 * @returns A human-readable column name
 */
export function getColumnName(key: string): string {
  // Convert key to title case (e.g., "BACKLOG" -> "Backlog")
  return key.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Priority order for sorting (from dynamic configuration)
export const priorityOrder = priorityConfig.order;

// Label colors
export const labelColors = {
  green: "bg-green-500 hover:bg-green-600",
  yellow: "bg-yellow-500 hover:bg-yellow-600",
  orange: "bg-orange-500 hover:bg-orange-600",
  red: "bg-red-500 hover:bg-red-600",
  purple: "bg-purple-500 hover:bg-purple-600",
  blue: "bg-blue-500 hover:bg-blue-600",
  sky: "bg-sky-500 hover:bg-sky-600",
  indigo: "bg-indigo-500 hover:bg-indigo-600",
  pink: "bg-pink-500 hover:bg-pink-600",
  rose: "bg-rose-500 hover:bg-rose-600",
};

// Default labels
export const defaultLabels: TaskLabel[] = [
  { id: "1", name: "Bug", color: "red" },
  { id: "2", name: "Feature", color: "green" },
  { id: "3", name: "Enhancement", color: "blue" },
  { id: "4", name: "Documentation", color: "purple" },
  { id: "5", name: "Design", color: "yellow" },
  { id: "6", name: "Testing", color: "orange" },
];
