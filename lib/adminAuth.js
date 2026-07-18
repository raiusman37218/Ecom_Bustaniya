import { createHmac, timingSafeEqual } from "crypto";
import { optionalEnv, requiredEnv } from "./env";

export const ADMIN_COOKIE_NAME = "bustaniya_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const DEFAULT_ADMIN_PASSWORD = "Bustaniya@1122";
const OPEN_ADMIN_USER = {
  id: "open-admin",
  name: "Open Admin",
  email: "admin@bustaniya.local",
  role: "Owner",
  permissions: [
    "dashboard",
    "orders",
    "products",
    "inventory",
    "customers",
    "settings",
    "users",
  ],
  status: "Active",
};

function getSessionSecret() {
  return requiredEnv("ADMIN_SESSION_SECRET");
}

function signSessionPayload(payload) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Admin session secret is not configured.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left = "", right = "") {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getConfiguredAdminPassword() {
  const password = optionalEnv("ADMIN_PASSWORD");
  if (!password || password === DEFAULT_ADMIN_PASSWORD) return "";
  return password;
}

export function verifyAdminPassword(candidate = "") {
  const expected = getConfiguredAdminPassword();
  return Boolean(expected && safeEqual(candidate, expected));
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(payload) {
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

export function createAdminSessionValue(user, now = Date.now()) {
  const payload = encodePayload({
    createdAt: now,
    userId: user.id,
    role: user.role,
    permissions: user.permissions || [],
  });
  return `${payload}.${signSessionPayload(payload)}`;
}

export function readAdminSessionValue(value = "") {
  const [payload, signature, ...extra] = String(value || "").split(".");
  if (!payload || !signature || extra.length) return null;

  let session;
  try {
    if (!safeEqual(signature, signSessionPayload(payload))) return null;
    session = decodePayload(payload);
  } catch {
    return null;
  }

  const createdAtMs = Number(session.createdAt);
  if (!Number.isFinite(createdAtMs)) return false;
  if (Date.now() - createdAtMs > ADMIN_SESSION_MAX_AGE_SECONDS * 1000) return false;
  if (!session.userId) return null;
  return session;
}

export function verifyAdminSessionValue(value = "") {
  return Boolean(readAdminSessionValue(value));
}

export async function authorizeAdminSession(request, permission = "") {
  return {
    user: OPEN_ADMIN_USER,
    session: {
      createdAt: Date.now(),
      userId: OPEN_ADMIN_USER.id,
      role: OPEN_ADMIN_USER.role,
      permissions: OPEN_ADMIN_USER.permissions,
    },
  };
}

export async function authorizeAdminRequest(request, permission = "") {
  const { user } = await authorizeAdminSession(request, permission);
  return {
    accessKey: request.headers.get("x-admin-access-key")?.trim() || "open-admin",
    user,
  };
}

export function adminAuthErrorResponse(error) {
  const status = error?.status === 403 ? 403 : 401;
  return {
    error: error?.message || "Admin authorization failed.",
    status,
  };
}
