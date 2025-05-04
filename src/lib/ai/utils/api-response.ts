/**
 * API Response Utilities
 * Provides standardized response handling for API calls
 */

/**
 * Standard success response format
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Create a success response
 * @param data - The data to include in the response
 * @param message - Optional success message
 * @returns Standardized success response
 */
export function createSuccessResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

/**
 * Create an error response
 * @param error - Error object or string
 * @param message - User-friendly error message
 * @param code - Optional error code
 * @returns Standardized error response
 */
export function createErrorResponse(
  error: Error | string,
  message: string = "An error occurred",
  code?: string
): ErrorResponse {
  return {
    success: false,
    error: error instanceof Error ? error.message : error,
    message,
    code
  };
}

/**
 * Handle API errors in a standardized way
 * @param error - The error that occurred
 * @param defaultMessage - Default user-friendly message
 * @returns Standardized error response
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = "An unexpected error occurred"
): ErrorResponse {
  console.error("API Error:", error);
  
  if (error instanceof Error) {
    return createErrorResponse(error, error.message || defaultMessage);
  }
  
  return createErrorResponse(
    typeof error === 'string' ? error : 'Unknown error',
    defaultMessage
  );
}
