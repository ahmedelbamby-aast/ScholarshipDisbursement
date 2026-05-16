/**
 * Shared application error taxonomy.
 *
 * Responsibilities:
 * - Provides stable typed errors with HTTP status mapping.
 * - Enables route/middleware layers to return deterministic error payloads.
 *
 * Usage:
 * - Throw `ValidationError` for input contract violations.
 * - Throw `AuthorizationError` for permission/authentication denials.
 * - Throw `DependencyUnavailableError` for unavailable external systems (DB/RPC).
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    // Name and status are intentionally serializable for centralized error middleware.
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

class DependencyUnavailableError extends AppError {
  constructor(message) {
    super(message, 503);
    this.name = "DependencyUnavailableError";
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

export { AppError, ValidationError, DependencyUnavailableError, AuthorizationError };
