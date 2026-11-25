export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Authentication required."): ApiError {
  return new ApiError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "You do not have permission."): ApiError {
  return new ApiError(403, "FORBIDDEN", message);
}

export function notFound(message = "Resource not found."): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError(409, "CONFLICT", message, details);
}

export function unprocessable(message: string, details?: unknown): ApiError {
  return new ApiError(422, "VALIDATION_FAILED", message, details);
}

export function serviceUnavailable(message: string): ApiError {
  return new ApiError(503, "SERVICE_UNAVAILABLE", message);
}

export function tooManyRequests(message: string): ApiError {
  return new ApiError(429, "TOO_MANY_REQUESTS", message);
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23503"
  );
}

export function isCheckViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23514"
  );
}
