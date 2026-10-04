type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, fields?: LogFields) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...sanitize(fields),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

function sanitize(fields?: LogFields): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("authorization") ||
      lower.includes("webhook") ||
      lower.includes("credential") ||
      lower.includes("api_key") ||
      lower.includes("apikey") ||
      lower === "database_url" ||
      lower.includes("cookie")
    ) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = value;
  }
  return out;
}

export const logger = {
  info(message: string, fields?: LogFields) {
    write("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    write("error", message, fields);
  },
};
