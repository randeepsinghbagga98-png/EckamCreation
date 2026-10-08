/**
 * Runs during apps/api build on Vercel:
 * - always: prisma generate
 * - only when DATABASE_URL is non-local:
 *     migrate deploy (or db push baseline recovery on P3005)
 *     seed + imported catalogue fixture
 *
 * Never targets localhost. Never prints DATABASE_URL.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

function run(args, { allowFail = false } = {}) {
  const result = spawnSync("pnpm", ["--filter", "@eckamcreation/database", "exec", ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) {
    process.stderr.write(
      stderr
        .replace(/postgresql:\/\/[^\s"']+/gi, "postgresql://***")
        .replace(/postgres:\/\/[^\s"']+/gi, "postgres://***"),
    );
  }
  if (result.status !== 0 && !allowFail) {
    throw new Error(`prisma step failed: ${args.join(" ")}`);
  }
  return { status: result.status ?? 1, stdout, stderr };
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

const migrate = run(["prisma", "migrate", "deploy"], { allowFail: true });
if (migrate.status !== 0) {
  const combined = `${migrate.stdout}\n${migrate.stderr}`;
  if (combined.includes("P3005")) {
    console.log(
      "P3005 detected (schema exists without migration history). Baseling migrations and syncing with db push.",
    );
    run(["prisma", "migrate", "resolve", "--applied", "20260918120000_phase1_init"], {
      allowFail: true,
    });
    run(["prisma", "migrate", "resolve", "--applied", "20261006120000_staff_sessions"], {
      allowFail: true,
    });
    // Ensure missing models/tables (e.g. Product) exist without wiping data.
    run(["prisma", "db", "push"]);
  } else {
    throw new Error("prisma migrate deploy failed");
  }
}

run(["node", "prisma/seed.mjs", "--allow-remote"]);
run(["node", "scripts/apply-catalogue-fixture.mjs", "--allow-remote"]);
console.log("Catalogue schema + data sync complete.");
