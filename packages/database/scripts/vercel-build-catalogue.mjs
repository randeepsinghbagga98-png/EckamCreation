/**
 * Runs during apps/api build on Vercel:
 * - always: prisma generate
 * - only when DATABASE_URL is non-local: migrate deploy + seed + fixture apply
 *
 * Never targets localhost. Never prints DATABASE_URL.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

function run(args) {
  const result = spawnSync("pnpm", ["--filter", "@eckamcreation/database", "exec", ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) {
    process.stderr.write(
      result.stderr
        .replace(/postgresql:\/\/[^\s"']+/gi, "postgresql://***")
        .replace(/postgres:\/\/[^\s"']+/gi, "postgres://***"),
    );
  }
  if (result.status !== 0) {
    throw new Error(`prisma step failed: ${args.join(" ")}`);
  }
}

function hostKind(url) {
  if (!url || url.includes("[SENSITIVE]")) return "missing";
  try {
    const host = new URL(url).hostname;
    if (/^(localhost|127\.0\.0\.1)$/i.test(host)) return "local";
    return "remote";
  } catch {
    return "invalid";
  }
}

const kind = hostKind(process.env.DATABASE_URL);
console.log(`catalogue build prep: database=${kind}`);

run(["prisma", "generate"]);

if (kind !== "remote") {
  console.log("Skipping migrate/seed/fixture (no remote DATABASE_URL).");
  process.exit(0);
}

const host = new URL(process.env.DATABASE_URL).hostname;
const suffix = host.includes(".") ? host.split(".").slice(-2).join(".") : host;
console.log(`Remote catalogue sync host suffix: ${suffix}`);

run(["prisma", "migrate", "deploy"]);
run(["node", "prisma/seed.mjs", "--allow-remote"]);
run(["node", "scripts/apply-catalogue-fixture.mjs", "--allow-remote"]);
console.log("Catalogue schema + data sync complete.");
