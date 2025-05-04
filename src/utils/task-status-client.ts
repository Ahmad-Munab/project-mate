/**
 * Import dynamic configuration
 */
import {
  minimalFallbackColumns,
  normalizeStatusKey as normalizeKey,
  isValidStatusKey
} from "@/config/dynamic-defaults";

/**
 * Base task status enum values
 * These are just examples - the system supports any valid status key
 */
export const BASE_STATUS_KEYS = ['BACKLOG', 'DONE'] as const;
export type ValidStatusEnum = string;

/**
 * Valid status enum values
 * This is a more comprehensive list of possible statuses
 * Note: This is just for reference - the system supports any valid status key
 */
export const VALID_STATUS_ENUMS = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'TESTING',
  'DONE',
  'ARCHIVED',
  'PLANNING',
  'DEVELOPMENT',
  'DESIGN',
  'RESEARCH',
  'ANALYSIS',
  'DEPLOYMENT',
  'QA',
  'BLOCKED',
  'READY',
  'WAITING',
  'REVIEW',
  'APPROVED',
  'REJECTED'
] as const;

/**
 * Default task statuses to initialize for a new project
 * Using dynamic configuration from central config
 */
export const DEFAULT_STATUSES = minimalFallbackColumns;

/**
 * Normalizes a status key (uppercase, no spaces)
 * @param key The status key to normalize
 * @returns Normalized status key
 */
export function normalizeStatusKey(key: string): string {
  return normalizeKey(key);
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
