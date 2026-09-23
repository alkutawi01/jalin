/**
 * API Error Sanitization
 *
 * Provides safe error responses that don't expose internal details.
 * Server logs detailed errors; client receives safe codes and messages.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ErrorCode;
  message: string;
}

/**
 * Create a safe API error response.
 * Logs detailed error server-side, returns safe code to client.
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  detail?: unknown
): ApiError {
  // Log detailed error server-side
  if (detail instanceof Error) {
    console.error(`[API Error] ${code}: ${message}`, detail.message);
  } else if (detail) {
    console.error(`[API Error] ${code}: ${message}`, detail);
  }

  return { code, message };
}

/**
 * Map a service error to a safe API error.
 */
export function mapServiceError(error: unknown): ApiError {
  if (error instanceof Error) {
    const message = error.message;

    // Map known error patterns to safe codes
    if (message.includes("not found") || message.includes("not found")) {
      return createApiError("NOT_FOUND", "Resource not found.", error);
    }
    if (message.includes("already exists") || message.includes("duplicate")) {
      return createApiError("CONFLICT", "Resource already exists.", error);
    }
    if (message.includes("not available") || message.includes("DATABASE_URL")) {
      return createApiError("INTERNAL_ERROR", "Service temporarily unavailable.", error);
    }
    if (message.includes("validation") || message.includes("required")) {
      return createApiError("VALIDATION_ERROR", "Invalid input data.", error);
    }
    if (message.includes("must provide") || message.includes("Must provide")) {
      return createApiError("VALIDATION_ERROR", "Invalid input data.", error);
    }

    // Default: safe internal error
    return createApiError("INTERNAL_ERROR", "An unexpected error occurred.", error);
  }

  return createApiError("INTERNAL_ERROR", "An unexpected error occurred.", error);
}
