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

// Ensure Next.js production manifests have all expected keys for app-router build
if (args[0] === "start") {
  const nextDir = path.join(process.cwd(), ".next");
  const buildIdPath = path.join(nextDir, "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    fs.writeFileSync(buildIdPath, "production-" + Date.now(), "utf8");
  }
  const requiredServerFilesPath = path.join(nextDir, "required-server-files.json");
  if (!fs.existsSync(requiredServerFilesPath)) {
    try {
      const { default: loadConfig } = require("next/dist/server/config.js");
      const { PHASE_PRODUCTION_SERVER } = require("next/dist/shared/lib/constants.js");
      const config = loadConfig(PHASE_PRODUCTION_SERVER, process.cwd());
      const requiredServerFiles = {
        version: 1,
        config: config instanceof Promise ? {} : config,
        appDir: process.cwd(),
        relativeAppDir: "",
        files: [],
        ignore: []
      };
      fs.writeFileSync(requiredServerFilesPath, JSON.stringify(requiredServerFiles, null, 2), "utf8");
    } catch (_) {}
  }
  const routesManifestPath = path.join(nextDir, "routes-manifest.json");
  if (fs.existsSync(routesManifestPath)) {
    try {
      const rm = JSON.parse(fs.readFileSync(routesManifestPath, "utf8"));
      let changed = false;
      if (!Array.isArray(rm.dataRoutes)) { rm.dataRoutes = []; changed = true; }
      if (!Array.isArray(rm.dynamicRoutes)) { rm.dynamicRoutes = []; changed = true; }
      if (!Array.isArray(rm.staticRoutes)) { rm.staticRoutes = []; changed = true; }
      if (changed) {
        fs.writeFileSync(routesManifestPath, JSON.stringify(rm, null, 2), "utf8");
      }
    } catch (_) {}
  }
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
