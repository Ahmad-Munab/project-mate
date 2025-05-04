/**
 * Dynamic Defaults Configuration
 * This file provides a centralized configuration system for dynamic defaults
 * that can be customized without hardcoding values throughout the codebase.
 */

import { TaskStatus } from "@/components/kanban/types";

/**
 * Available column colors for dynamic assignment
 */
export const availableColumnColors = [
  "bg-gray-50 dark:bg-gray-900",
  "bg-blue-50 dark:bg-blue-900/20",
  "bg-green-50 dark:bg-green-900/20",
  "bg-emerald-50 dark:bg-emerald-900/20",
  "bg-purple-50 dark:bg-purple-900/20",
  "bg-indigo-50 dark:bg-indigo-900/20",
  "bg-amber-50 dark:bg-amber-900/20",
  "bg-orange-50 dark:bg-orange-900/20",
  "bg-red-50 dark:bg-red-900/20",
  "bg-pink-50 dark:bg-pink-900/20",
  "bg-yellow-50 dark:bg-yellow-900/20",
  "bg-teal-50 dark:bg-teal-900/20",
  "bg-cyan-50 dark:bg-cyan-900/20",
  "bg-violet-50 dark:bg-violet-900/20",
  "bg-rose-50 dark:bg-rose-900/20",
];

/**
 * Get a color for a column based on its index or name
 * @param index Column index or name
 * @returns A color from the available colors
 */
export function getColumnColor(index: number | string): string {
  if (typeof index === 'string') {
    // Hash the string to get a consistent index
    const hash = index.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    return availableColumnColors[hash % availableColumnColors.length];
  }
  return availableColumnColors[index % availableColumnColors.length];
}

/**
 * Minimal fallback columns when all else fails
 * This is only used as a last resort when no other columns can be created
 */
export const minimalFallbackColumns = [
  {
    name: "Backlog",
    key: "BACKLOG",
    color: getColumnColor(0),
    order: 0,
    is_default: true,
  },
  {
    name: "In Progress",
    key: "IN_PROGRESS",
    color: getColumnColor(1),
    order: 1,
    is_default: false,
  },
  {
    name: "Done",
    key: "DONE",
    color: getColumnColor(2),
    order: 2,
    is_default: false,
  },
];

/**
 * Generate dynamic columns based on project description or type
 * @param projectDescription Project description or type
 * @returns Array of column configurations
 */
export function generateDynamicColumns(projectDescription: string): Array<{
  name: string;
  key: string;
  color: string;
  order: number;
  is_default: boolean;
}> {
  // Extract keywords from description to customize columns
  const keywords = projectDescription.toLowerCase().split(/\s+/)
    .filter(word => word.length > 4)
    .filter(word => !["project", "create", "build", "develop", "implement"].includes(word));

  // Start with required backlog column
  const columns = [
    {
      name: "Backlog",
      key: "BACKLOG",
      color: getColumnColor(0),
      order: 0,
      is_default: true,
    }
  ];

  // Detect project type from description
  const isSoftwareDev = /software|app|application|web|mobile|development|coding|programming/.test(projectDescription.toLowerCase());
  const isDesign = /design|ui|ux|interface|graphic|visual/.test(projectDescription.toLowerCase());
  const isMarketing = /marketing|campaign|social media|content|seo|advertising/.test(projectDescription.toLowerCase());
  const isResearch = /research|study|analysis|data|survey|experiment/.test(projectDescription.toLowerCase());

  // Add type-specific columns
  if (isSoftwareDev) {
    columns.push(
      {
        name: "Planning",
        key: "PLANNING",
        color: getColumnColor(1),
        order: 1,
        is_default: false,
      },
      {
        name: "Development",
        key: "DEVELOPMENT",
        color: getColumnColor(2),
        order: 2,
        is_default: false,
      },
      {
        name: "Testing",
        key: "TESTING",
        color: getColumnColor(3),
        order: 3,
        is_default: false,
      },
      {
        name: "Review",
        key: "REVIEW",
        color: getColumnColor(4),
        order: 4,
        is_default: false,
      }
    );
  } else if (isDesign) {
    columns.push(
      {
        name: "Concept",
        key: "CONCEPT",
        color: getColumnColor(1),
        order: 1,
        is_default: false,
      },
      {
        name: "Design",
        key: "DESIGN",
        color: getColumnColor(2),
        order: 2,
        is_default: false,
      },
      {
        name: "Review",
        key: "REVIEW",
        color: getColumnColor(3),
        order: 3,
        is_default: false,
      }
    );
  } else if (isMarketing) {
    columns.push(
      {
        name: "Planning",
        key: "PLANNING",
        color: getColumnColor(1),
        order: 1,
        is_default: false,
      },
      {
        name: "Creating",
        key: "CREATING",
        color: getColumnColor(2),
        order: 2,
        is_default: false,
      },
      {
        name: "Reviewing",
        key: "REVIEWING",
        color: getColumnColor(3),
        order: 3,
        is_default: false,
      }
    );
  } else if (isResearch) {
    columns.push(
      {
        name: "Research",
        key: "RESEARCH",
        color: getColumnColor(1),
        order: 1,
        is_default: false,
      },
      {
        name: "Analysis",
        key: "ANALYSIS",
        color: getColumnColor(2),
        order: 2,
        is_default: false,
      },
      {
        name: "Review",
        key: "REVIEW",
        color: getColumnColor(3),
        order: 3,
        is_default: false,
      }
    );
  } else {
    // Generic columns for any other project type
    columns.push(
      {
        name: "In Progress",
        key: "IN_PROGRESS",
        color: getColumnColor(1),
        order: 1,
        is_default: false,
      },
      {
        name: "Review",
        key: "REVIEW",
        color: getColumnColor(2),
        order: 2,
        is_default: false,
      }
    );
  }

  // Add a custom column based on keywords if available
  if (keywords.length > 0) {
    const customName = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1).toLowerCase();
    const customKey = customName.toUpperCase().replace(/\s+/g, '_');
    
    // Only add if not already present
    if (!columns.some(col => col.key === customKey)) {
      columns.push({
        name: customName,
        key: customKey,
        color: getColumnColor(columns.length),
        order: columns.length,
        is_default: false,
      });
    }
  }

  // Always add Done column at the end
  columns.push({
    name: "Done",
    key: "DONE",
    color: getColumnColor(columns.length),
    order: columns.length,
    is_default: false,
  });

  return columns;
}

/**
 * Get default task statuses for a project
 * @param projectId Project ID
 * @param projectDescription Optional project description for customization
 * @returns Array of default task statuses
 */
export function getDefaultTaskStatuses(projectId: string, projectDescription?: string): TaskStatus[] {
  const columns = projectDescription 
    ? generateDynamicColumns(projectDescription)
    : minimalFallbackColumns;
    
  return columns.map(column => ({
    id: `default-${column.key.toLowerCase()}`,
    project_id: projectId,
    name: column.name,
    key: column.key,
    color: column.color,
    is_default: column.is_default,
    order: column.order,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Priority configuration
 */
export const priorityConfig = {
  levels: ["LOW", "MEDIUM", "HIGH", "URGENT"],
  default: "MEDIUM",
  colors: {
    LOW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    MEDIUM: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  barColors: {
    LOW: "bg-blue-500",
    MEDIUM: "bg-green-500",
    HIGH: "bg-orange-500",
    URGENT: "bg-red-500",
  },
  order: {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  },
};

/**
 * Normalize a status key (uppercase, replace spaces with underscores)
 * @param key The status key to normalize
 * @returns Normalized status key
 */
export function normalizeStatusKey(key: string): string {
  return key.toUpperCase().replace(/\s+/g, '_');
}

/**
 * Check if a status key is valid
 * @param key The status key to check
 * @returns Whether the key is valid
 */
export function isValidStatusKey(key: string): boolean {
  // Status keys should be uppercase with underscores
  return /^[A-Z0-9_]+$/.test(key);
}
