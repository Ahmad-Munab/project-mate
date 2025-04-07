/**
 * Valid task status enum values
 */
export const VALID_STATUS_ENUMS = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'] as const;
export type ValidStatusEnum = typeof VALID_STATUS_ENUMS[number];

/**
 * Default task statuses to initialize for a new project
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
    name: "To Do",
    key: "TODO",
    color: "bg-neutral-50 dark:bg-neutral-900",
    order: 1,
    is_default: false,
  },
  {
    name: "In Progress",
    key: "IN_PROGRESS",
    color: "bg-blue-50 dark:bg-blue-900/20",
    order: 2,
    is_default: false,
  },
  {
    name: "Done",
    key: "DONE",
    color: "bg-green-50 dark:bg-green-900/20",
    order: 3,
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
  return VALID_STATUS_ENUMS.includes(status as ValidStatusEnum);
}
