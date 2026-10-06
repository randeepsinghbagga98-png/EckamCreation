export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Array<{ path?: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ path?: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: "Sign in required.",
  403: "You do not have permission to perform this action.",
  404: "The requested record was not found.",
  409: "This change conflicts with the current record.",
  422: "The submitted data could not be processed.",
  429: "Too many requests. Please wait and try again.",
  500: "Something went wrong. Please try again.",
  502: "The API service is unavailable. Please try again.",
  503: "The API service is unavailable. Please try again.",
  504: "The API service timed out. Please try again.",
};

const UNSAFE_MESSAGE =
  /prisma|postgres|database url|stack|ai_api_key|password|secret|token|internal server/i;

export function safeUserMessage(
  status: number,
  code?: string,
  raw?: string,
): string {
  if (status === 400 || code === "VALIDATION_ERROR") {
    if (raw && !UNSAFE_MESSAGE.test(raw) && raw.length < 180) return raw;
    return "Please check the highlighted fields and try again.";
  }
  if (raw && !UNSAFE_MESSAGE.test(raw) && STATUS_MESSAGES[status] === undefined && raw.length < 180) {
    return raw;
  }
  return STATUS_MESSAGES[status] ?? "The request could not be completed. Please try again.";
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}
