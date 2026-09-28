import { ZodError, type ZodType } from "zod";
import { fromZodError } from "./errors";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw fromZodError(
      new ZodError([{ code: "custom", message: "Invalid JSON body", path: [] }]),
    );
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw fromZodError(parsed.error);
  return parsed.data;
}
