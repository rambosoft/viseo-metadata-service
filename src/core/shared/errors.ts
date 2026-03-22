export type ErrorCode =
  | "validation_failed"
  | "authentication_failed"
  | "authorization_failed"
  | "not_found"
  | "rate_limited"
  | "provider_unavailable"
  | "dependency_unavailable"
  | "internal_error";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly retryable: boolean;

  public constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    retryable = false,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

export class ValidationError extends AppError {
  public constructor(message: string) {
    super("validation_failed", message, 400, false);
  }
}

export class AuthenticationError extends AppError {
  public constructor(message = "Authentication failed") {
    super("authentication_failed", message, 401, false);
  }
}

export class NotFoundError extends AppError {
  public constructor(message = "Resource not found") {
    super("not_found", message, 404, false);
  }
}

export class ProviderUnavailableError extends AppError {
  public constructor(message = "Provider unavailable") {
    super("provider_unavailable", message, 502, true);
  }
}

export class DependencyUnavailableError extends AppError {
  public constructor(message = "Dependency unavailable") {
    super("dependency_unavailable", message, 503, true);
  }
}
