/**
 * Production-safe Neon catalogue sync:
 * 1) prisma migrate deploy
 * 2) seed (11 catalogue products + INR/categories)
 * 3) import-products (86 organized_products rows; no invented prices/stock)
 *
 * Usage (repo root, session DATABASE_URL = Neon production):
 *   node packages/database/scripts/sync-production-catalogue.mjs --dry-run
 *   node packages/database/scripts/sync-production-catalogue.mjs
 *
 * Refuses localhost. Never prints DATABASE_URL.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const DB_PKG = join(ROOT, "packages/database");
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_IMPORT = process.argv.includes("--skip-import");
const SKIP_SEED = process.argv.includes("--skip-seed");

function loadEnvFile(path) {
  if (!existsSync(path)) return false;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key] && value && !value.includes("[SENSITIVE]")) {
      process.env[key] = value;
    }
  }
  return true;
}

function loadEnv() {
  // Prefer Vercel-pulled production env. Never fall back to .env.local for writes
  // when a production file is present; .env.local is only used if no session URL
  // and no Vercel file (still refused if host is localhost).
  if (!loadEnvFile(join(ROOT, ".env.vercel.production"))) {
    loadEnvFile(join(ROOT, ".env.local"));
  }
}

function hostInfo(url) {
  try {
    const host = new URL(url).hostname;
    const suffix = host.includes(".") ? host.split(".").slice(-2).join(".") : host;
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(host);
    const looksNeon = /\.neon\.tech$/i.test(host);
    return { host, suffix, isLocal, looksNeon };
  } catch {
    return { host: "UNKNOWN", suffix: "UNKNOWN", isLocal: false, looksNeon: false };
  }
}

function run(cmd, args, env) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    env,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) {
    const redacted = result.stderr
      .replace(/postgresql:\/\/[^\s"']+/gi, "postgresql://***")
      .replace(/postgres:\/\/[^\s"']+/gi, "postgres://***");
    process.stderr.write(redacted);
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")} (exit ${result.status})`);
  }
}

async function reportCounts(label) {
  const prisma = new PrismaClient();
  try {
    const [products, active, categories, variants, media] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.productVariant.count({ where: { deletedAt: null } }),
      prisma.productMedia.count(),
    ]);
    const samples = await prisma.product.findMany({
      where: {
        deletedAt: null,
        slug: {
          in: [
            "sky-blue-white-handbag",
            "noir-compact-bag",
            "electric-hot-pot-front-top-bottom-3d-hd-2",
          ],
        },
      },
      select: { slug: true, name: true, status: true },
    });
    console.log(
      JSON.stringify(
        {
          label,
          products,
          active,
          categories,
          variants,
          media,
          samples,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Pull Vercel production env into .env.vercel.production or set the session variable.",
    );
  }

  const info = hostInfo(url);
  if (info.isLocal) {
    throw new Error("Refusing sync: DATABASE_URL host is LOCAL. Use Neon production URL only.");
  }
  console.log(`Target host suffix: ${info.suffix}`);
  console.log(`Looks like Neon: ${info.looksNeon ? "yes" : "no (verify before writing)"}`);
  console.log(`Dry run: ${DRY_RUN ? "yes" : "no"}`);

  const env = { ...process.env, DATABASE_URL: url };

  if (DRY_RUN) {
    // Connectivity + table existence check only.
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const tables = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Product'
      `;
      console.log(
        JSON.stringify({
          connected: true,
          productTablePresent: Array.isArray(tables) && tables.length > 0,
        }),
      );
    } finally {
      await prisma.$disconnect();
    }
    console.log("Dry-run complete. Re-run without --dry-run to migrate + seed + import.");
    return;
  }

  console.log("→ prisma migrate deploy");
  run(
    "pnpm",
    ["--filter", "@eckamcreation/database", "exec", "prisma", "migrate", "deploy"],
    env,
  );

  if (!SKIP_SEED) {
    console.log("→ seed (idempotent 11 products)");
    run(
      "pnpm",
      ["--filter", "@eckamcreation/database", "exec", "node", "prisma/seed.mjs", "--allow-remote"],
      env,
    );
  }

  if (!SKIP_IMPORT) {
    console.log("→ apply-catalogue-fixture (idempotent imported products)");
    run(
      "pnpm",
      [
        "--filter",
        "@eckamcreation/database",
        "exec",
        "node",
        "scripts/apply-catalogue-fixture.mjs",
        "--allow-remote",
      ],
      env,
    );
  }

  await reportCounts("after-sync");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    message.replace(/postgresql:\/\/[^\s"']+/gi, "postgresql://***").replace(/postgres:\/\/[^\s"']+/gi, "postgres://***"),
  );
  process.exitCode = 1;
});
