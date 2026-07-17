const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function readLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) return env;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
      return env;
    }, {});
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/start-next-with-env.js <next args...>");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), ...args],
  {
    cwd: process.cwd(),
    env: { ...process.env, ...readLocalEnv() },
    stdio: "inherit",
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});
