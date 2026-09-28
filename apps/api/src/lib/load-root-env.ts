import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Next.js loads env from the app directory. Monorepo secrets live at repo-root
 * `.env.local` — merge missing keys without overwriting already-set process env.
 * Never logs values.
 */
export function loadRootEnvLocal(): void {
  // Prefer already-injected env (CI/production, dotenv in app dir).
  if (process.env.DATABASE_URL) return;

  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "..", "..", ".env.local"),
  ];

  for (const filePath of candidates) {
    if (!existsSync(/* turbopackIgnore: true */ filePath)) continue;
    const text = readFileSync(/* turbopackIgnore: true */ filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = value;
      }
    }
    break;
  }
}
