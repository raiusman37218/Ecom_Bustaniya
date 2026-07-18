import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { optionalEnv } from "./env";
import { supabaseAdminRequest } from "./supabaseRest";

export const ADMIN_PERMISSIONS = [
  "dashboard",
  "orders",
  "products",
  "inventory",
  "customers",
  "settings",
  "users",
];

const SEED_USERS_FILE = path.join(process.cwd(), "data", "admin-users.json");
function tempUsersFile() {
  return path.join(os.tmpdir(), "bustaniya-western", "admin-users.json");
}

function homeUsersFile() {
  return path.join(os.homedir(), ".bustaniya-western", "Bustaniya Western", "admin-users.json");
}

function defaultWritableUsersFile() {
  if (optionalEnv("ADMIN_USERS_FILE")) return optionalEnv("ADMIN_USERS_FILE");
  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, "Bustaniya Western", "admin-users.json");
  }
  if (process.cwd().startsWith("/var/task") || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return tempUsersFile();
  }
  return homeUsersFile();
}

const WRITABLE_USERS_FILE = defaultWritableUsersFile();
const USER_FILE_FALLBACKS = [WRITABLE_USERS_FILE, tempUsersFile(), homeUsersFile()].filter(
  (filePath, index, files) => filePath && files.indexOf(filePath) === index
);
const DEFAULT_OWNER_EMAIL = "owner@bustaniya.local";
const DEFAULT_ADMIN_PASSWORD = "Bustaniya@1122";
let activeUsersFile = "";
let activeUsersStore = "";

function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function permissionList(value = []) {
  const incoming = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(incoming.map((item) => String(item).trim()).filter((item) => ADMIN_PERMISSIONS.includes(item)))];
}

function allPermissions() {
  return [...ADMIN_PERMISSIONS];
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(String(password), salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored = "") {
  const [scheme, salt, hash] = String(stored || "").split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const actual = Buffer.from(scryptSync(String(password), salt, 64).toString("base64url"));
  const expected = Buffer.from(hash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.role === "Owner" ? allPermissions() : permissionList(user.permissions),
    status: user.status || "Active",
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || "",
    lastLoginAt: user.lastLoginAt || "",
  };
}

function hasSupabaseAdminUsersConfig() {
  return Boolean(
    optionalEnv("SUPABASE_URL")
    && (optionalEnv("SUPABASE_SERVICE_ROLE_KEY") || optionalEnv("SUPABASE_SERVICE_KEY") || optionalEnv("SUPABASE_SECRET_KEY"))
    && optionalEnv("ADMIN_USERS_STORE") !== "file"
  );
}

function dbUserToUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: normalizeEmail(row.email),
    role: row.role,
    permissions: permissionList(row.permissions),
    passwordHash: row.password_hash,
    status: row.status || "Active",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    lastLoginAt: row.last_login_at || "",
  };
}

function userToDbUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: normalizeEmail(user.email),
    role: user.role === "Owner" ? "Owner" : "Staff",
    permissions: user.role === "Owner" ? allPermissions() : permissionList(user.permissions),
    password_hash: user.passwordHash,
    status: user.status === "Disabled" ? "Disabled" : "Active",
    created_at: user.createdAt || new Date().toISOString(),
    updated_at: user.updatedAt || new Date().toISOString(),
    last_login_at: user.lastLoginAt || null,
  };
}

async function readUsersFileAt(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function readUsersFile() {
  if (hasSupabaseAdminUsersConfig()) {
    try {
      const rows = await supabaseAdminRequest("admin_users?select=*&order=created_at.asc");
      activeUsersStore = "supabase";
      if (Array.isArray(rows) && rows.length) return rows.map(dbUserToUser);

      const seedUsers = await readUsersFileAt(SEED_USERS_FILE);
      if (seedUsers.length) {
        await writeUsersFile(seedUsers);
        return seedUsers;
      }
      return [];
    } catch {
      activeUsersStore = "";
    }
  }

  for (const filePath of USER_FILE_FALLBACKS) {
    const writableUsers = await readUsersFileAt(filePath);
    if (writableUsers.length) {
      activeUsersStore = "file";
      activeUsersFile = filePath;
      return writableUsers;
    }
  }

  const seedUsers = await readUsersFileAt(SEED_USERS_FILE);
  activeUsersStore = "file";
  activeUsersFile = WRITABLE_USERS_FILE;
  return seedUsers;
}

async function writeUsersFileAt(filePath, users) {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(
      filePath,
      `${JSON.stringify({ users }, null, 2)}\n`,
      "utf8"
    );
  } catch (error) {
    const details = error?.code ? ` (${error.code})` : "";
    throw Object.assign(
      new Error(`Admin users file could not be saved${details}. Check write access for ${filePath}.`),
      { status: 500, code: error?.code }
    );
  }
}

async function writeUsersFile(users) {
  if (activeUsersStore === "supabase" || hasSupabaseAdminUsersConfig()) {
    try {
      const payload = users.map(userToDbUser);
      if (payload.length) {
        await supabaseAdminRequest("admin_users?on_conflict=id", {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=minimal",
          body: payload,
        });
      }
      activeUsersStore = "supabase";
      return;
    } catch (error) {
      if (activeUsersStore === "supabase") {
        throw Object.assign(
          new Error(error?.message || "Admin users could not be saved to Supabase."),
          { status: error?.status || 500 }
        );
      }
    }
  }

  const targets = [activeUsersFile, ...USER_FILE_FALLBACKS].filter(
    (filePath, index, files) => filePath && files.indexOf(filePath) === index
  );
  let lastError = null;

  for (const target of targets) {
    try {
      await writeUsersFileAt(target, users);
      activeUsersFile = target;
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || Object.assign(
    new Error("Admin users file could not be saved. No storage path is configured."),
    { status: 500 }
  );
}

async function deleteUsersFile(userId) {
  if (activeUsersStore === "supabase" || hasSupabaseAdminUsersConfig()) {
    try {
      await supabaseAdminRequest(`admin_users?id=eq.${encodeURIComponent(userId)}`, {
        method: "DELETE",
        prefer: "return=minimal",
      });
      activeUsersStore = "supabase";
      return true;
    } catch (error) {
      if (activeUsersStore === "supabase") {
        throw Object.assign(
          new Error(error?.message || "Admin user could not be deleted from Supabase."),
          { status: error?.status || 500 }
        );
      }
    }
  }

  return false;
}

async function tryWriteUsersFile(users) {
  try {
    await writeUsersFile(users);
    return true;
  } catch {
    return false;
  }
}

function ownerFromEnv(password) {
  const now = new Date().toISOString();
  return {
    id: "owner",
    name: optionalEnv("ADMIN_NAME") || "Owner",
    email: normalizeEmail(optionalEnv("ADMIN_EMAIL") || DEFAULT_OWNER_EMAIL),
    role: "Owner",
    permissions: allPermissions(),
    passwordHash: hashPassword(password),
    status: "Active",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: "",
  };
}

async function ensureBootstrapOwner() {
  const users = await readUsersFile();
  if (users.length) return users;

  const password = optionalEnv("ADMIN_PASSWORD");
  if (!password || password === DEFAULT_ADMIN_PASSWORD) return users;

  const owner = ownerFromEnv(password);
  await tryWriteUsersFile([owner]);
  return [owner];
}

function verifyConfiguredOwnerPassword(user, password) {
  if (user?.role !== "Owner") return false;
  const configuredPassword = optionalEnv("ADMIN_PASSWORD");
  if (!configuredPassword || configuredPassword === DEFAULT_ADMIN_PASSWORD) return false;
  return String(password || "") === configuredPassword;
}

export async function listAdminUsers() {
  const users = await ensureBootstrapOwner();
  return users.map(safeUser);
}

export async function authenticateAdminUser({ email, password }) {
  const users = await ensureBootstrapOwner();
  const normalizedEmail = normalizeEmail(email);
  const activeUsers = users.filter((user) => (user.status || "Active") === "Active");
  const user = normalizedEmail
    ? activeUsers.find((item) => item.email === normalizedEmail)
    : activeUsers.find((item) => item.role === "Owner");

  if (!user) return null;

  const passwordMatches = verifyPassword(password, user.passwordHash);
  const configuredOwnerPasswordMatches = !passwordMatches && verifyConfiguredOwnerPassword(user, password);
  if (!passwordMatches && !configuredOwnerPasswordMatches) return null;

  if (configuredOwnerPasswordMatches) {
    user.passwordHash = hashPassword(password);
  }

  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = user.updatedAt || user.lastLoginAt;
  await tryWriteUsersFile(users);
  return safeUser(user);
}

export async function findAdminUser(userId) {
  const users = await ensureBootstrapOwner();
  const user = users.find((item) => item.id === userId);
  return user ? safeUser(user) : null;
}

export async function createAdminUser(input = {}) {
  const users = await ensureBootstrapOwner();
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  if (!email) throw Object.assign(new Error("Email is required."), { status: 400 });
  if (users.some((user) => user.email === email)) {
    throw Object.assign(new Error("This admin user already exists."), { status: 409 });
  }
  if (password.length < 10) {
    throw Object.assign(new Error("Password must be at least 10 characters."), { status: 400 });
  }

  const now = new Date().toISOString();
  const role = input.role === "Owner" ? "Owner" : "Staff";
  const user = {
    id: randomUUID(),
    name: String(input.name || email.split("@")[0] || "Staff").trim(),
    email,
    role,
    permissions: role === "Owner" ? allPermissions() : permissionList(input.permissions),
    passwordHash: hashPassword(password),
    status: input.status === "Disabled" ? "Disabled" : "Active",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: "",
  };
  users.push(user);
  await writeUsersFile(users);
  return safeUser(user);
}

export async function updateAdminUser(userId, input = {}) {
  const users = await ensureBootstrapOwner();
  const user = users.find((item) => item.id === userId);
  if (!user) throw Object.assign(new Error("Admin user not found."), { status: 404 });

  if (input.name !== undefined) user.name = String(input.name || user.name).trim();
  if (input.role !== undefined) user.role = input.role === "Owner" ? "Owner" : "Staff";
  if (input.permissions !== undefined) {
    user.permissions = user.role === "Owner" ? allPermissions() : permissionList(input.permissions);
  }
  if (input.status !== undefined) {
    const nextStatus = input.status === "Disabled" ? "Disabled" : "Active";
    if (user.role === "Owner" && nextStatus === "Disabled") {
      const activeOwners = users.filter((item) => item.id !== user.id && item.role === "Owner" && (item.status || "Active") === "Active");
      if (!activeOwners.length) throw Object.assign(new Error("At least one owner must remain active."), { status: 400 });
    }
    user.status = nextStatus;
  }
  if (input.password) {
    const password = String(input.password);
    if (password.length < 10) {
      throw Object.assign(new Error("Password must be at least 10 characters."), { status: 400 });
    }
    user.passwordHash = hashPassword(password);
  }
  user.updatedAt = new Date().toISOString();
  await writeUsersFile(users);
  return safeUser(user);
}

export async function deleteAdminUser(userId) {
  const users = await ensureBootstrapOwner();
  const user = users.find((item) => item.id === userId);
  if (!user) throw Object.assign(new Error("Admin user not found."), { status: 404 });
  if (user.role === "Owner") {
    const otherOwners = users.filter((item) => item.id !== user.id && item.role === "Owner" && (item.status || "Active") === "Active");
    if (!otherOwners.length) throw Object.assign(new Error("At least one owner must remain active."), { status: 400 });
  }
  if (!(await deleteUsersFile(userId))) {
    await writeUsersFile(users.filter((item) => item.id !== userId));
  }
  return { deleted: true };
}

export function hasAdminPermission(user, permission) {
  if (!permission) return true;
  if (!user) return false;
  if (user.role === "Owner") return true;
  return permissionList(user.permissions).includes(permission);
}
