/**
 * Base task status enum values
 * These are just examples - the system supports any valid status key
 */
export const BASE_STATUS_KEYS = ['BACKLOG', 'DONE'] as const;
export type ValidStatusEnum = string;

/**
 * Default task statuses to initialize for a new project
 * Minimal set - the AI will create more specialized columns based on project needs
 */
export const DEFAULT_STATUSES = [
  {
    name: "Backlog",
    key: "BACKLOG",
    color: "bg-gray-50 dark:bg-gray-900",
    order: 0,
    is_default: true,
  },
  {
    name: "Done",
    key: "DONE",
    color: "bg-emerald-50 dark:bg-emerald-900/20",
    order: 1,
    is_default: false,
  },
];

/**
 * Normalizes a status key (uppercase, no spaces)
 * @param key The status key to normalize
 * @returns Normalized status key
 */
export function normalizeStatusKey(key: string): string {
  return key.toUpperCase().replace(/\s+/g, '_');
}

/**
 * Checks if a status is a valid enum value
 * @param status The status to check
 * @returns Whether the status is a valid enum value
 */
export function isValidStatusEnum(status: string): boolean {
  // Check if it's a valid format (uppercase with underscores)
  // This allows any custom statuses created by the AI
  return /^[A-Z][A-Z0-9_]*$/.test(status);
}
