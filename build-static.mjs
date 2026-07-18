import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd next build" : "npx next build";
const result = spawnSync(command, {
  env: { ...process.env, NEXT_OUTPUT: "export" },
  shell: true,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
