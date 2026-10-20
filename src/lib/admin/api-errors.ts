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

/**
 * The message of an error as it may be shown in a response. A message the application wrote itself ("Istilah diperlukan.") is plain
 * text from a plain Error and is passed on; what a database driver, the network or a library threw (a coded error, a library or runtime error,
 * or text that names tables, columns, constraints, hosts or secrets) is logged here and replaced by the fallback.
 */
const INTERNAL_TEXT = /relation "|column "|constraint|violates|syntax error|duplicate key|deadlock|\bSQL\b|kysely|neon|postgres|pg_|ECONN|ETIMEDOUT|ENOTFOUND|fetch failed|socket|DATABASE_URL|ADMIN_SECRET|secret|token|password|migrasi 0\d\d|\bat [\w.$<>]+ \(|node_modules|\.tsx?:\d+/i;

/** Names of the errors a database driver, the runtime or the network throw (the application's own classes, such as DuplicateTermError, are not among them). */
const LIBRARY_ERRORS = new Set(["DatabaseError", "NeonDbError", "PostgresError", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "FetchError", "AbortError", "SystemError"]);

export function publicErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message ?? "";
  const code = String((error as { code?: unknown }).code ?? "");
  const fromLibrary = /^[0-9A-Z]{5}$/.test(code) || code.startsWith("E") || "severity" in error || LIBRARY_ERRORS.has(error.name);
  const plain = !fromLibrary;
  if (plain && message.length > 0 && message.length <= 300 && !INTERNAL_TEXT.test(message)) return message;
  console.error("[API Error] hidden from the response:", error);
  return fallback;
}
