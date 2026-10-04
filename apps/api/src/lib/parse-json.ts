import { ZodError, type ZodType } from "zod";
import { ApiError, fromZodError } from "./errors";

const DEFAULT_JSON_BODY_LIMIT = 1_048_576;

export function jsonBodyLimitBytes(): number {
  const raw = Number(process.env.API_JSON_BODY_LIMIT_BYTES ?? DEFAULT_JSON_BODY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_JSON_BODY_LIMIT;
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const limit = jsonBodyLimitBytes();
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > limit) {
    throw new ApiError("VALIDATION_ERROR", "Request body is too large", { status: 413 });
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw fromZodError(
      new ZodError([{ code: "custom", message: "Invalid JSON body", path: [] }]),
    );
  }
  if (text.length > limit) {
    throw new ApiError("VALIDATION_ERROR", "Request body is too large", { status: 413 });
  }

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw fromZodError(
      new ZodError([{ code: "custom", message: "Invalid JSON body", path: [] }]),
    );
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw fromZodError(parsed.error);
  return parsed.data;
}
