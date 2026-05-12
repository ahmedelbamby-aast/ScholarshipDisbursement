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

export { AppError, ValidationError, DependencyUnavailableError };
