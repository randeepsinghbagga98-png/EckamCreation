import { AuthError } from "@eckamcreation/auth";
import { ApiError, conflict, unauthorized, validationError } from "../errors";

export function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
      case "UNAUTHORIZED":
        throw unauthorized(error.message);
      case "EMAIL_TAKEN":
        throw conflict(error.message);
      case "WEAK_PASSWORD":
        throw validationError(error.message);
      case "ACCOUNT_DISABLED":
      case "FORBIDDEN":
        throw new ApiError("FORBIDDEN", error.message, { status: 403 });
      case "NOT_FOUND":
        throw new ApiError("NOT_FOUND", error.message, { status: 404 });
      default:
        throw error;
    }
  }
  throw error;
}
