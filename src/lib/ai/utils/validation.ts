/**
 * Validation Utilities
 * Provides input validation functions for AI tools
 */

/**
 * Validate that a string is not empty
 * @param value - The string to validate
 * @param name - The name of the parameter for error messages
 * @throws Error if validation fails
 */
export function validateNonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }
  
  if (!value.trim()) {
    throw new Error(`${name} cannot be empty`);
  }
}

/**
 * Validate that a value is a valid UUID
 * @param value - The value to validate
 * @param name - The name of the parameter for error messages
 * @throws Error if validation fails
 */
export function validateUuid(value: unknown, name: string): asserts value is string {
  validateNonEmptyString(value, name);
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error(`${name} must be a valid UUID`);
  }
}

/**
 * Validate that a value is a valid priority level
 * @param value - The value to validate
 * @param name - The name of the parameter for error messages
 * @throws Error if validation fails
 */
export function validatePriority(
  value: unknown,
  name: string
): asserts value is "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  validateNonEmptyString(value, name);
  
  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  if (!validPriorities.includes(value.toUpperCase())) {
    throw new Error(`${name} must be one of: ${validPriorities.join(', ')}`);
  }
}

/**
 * Validate that a value is a valid color
 * @param value - The value to validate
 * @param name - The name of the parameter for error messages
 * @throws Error if validation fails
 */
export function validateColor(value: unknown, name: string): asserts value is string {
  validateNonEmptyString(value, name);
  
  const validColors = ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'orange'];
  if (!validColors.includes(value.toLowerCase())) {
    throw new Error(`${name} must be one of: ${validColors.join(', ')}`);
  }
}

/**
 * Validate that a value is a valid date string
 * @param value - The value to validate
 * @param name - The name of the parameter for error messages
 * @throws Error if validation fails
 */
export function validateDateString(value: unknown, name: string): asserts value is string {
  if (value === null) return; // Allow null for removing dates
  
  validateNonEmptyString(value, name);
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`${name} must be a valid date string`);
  }
}

/**
 * Validate that a value is an array
 * @param value - The value to validate
 * @param name - The name of the parameter for error messages
 * @throws Error if validation fails
 */
export function validateArray<T>(value: unknown, name: string): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  
  if (value.length === 0) {
    throw new Error(`${name} cannot be empty`);
  }
}
