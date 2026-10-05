import { spawn } from "node:child_process";
import { join } from "node:path";
const ROOT = "C:/Users/WeShippX/Desktop/eckamcreation";
const child = spawn("pnpm", ["-r", "--workspace-concurrency=1", "--if-present", "build"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 1));
