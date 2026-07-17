import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdminRpc } from "./supabaseRest";
import { optionalEnv, requiredEnv } from "./env";
import { findAdminUser, hasAdminPermission } from "./adminUsers";

export const ADMIN_COOKIE_NAME = "bustaniya_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const DEFAULT_ADMIN_PASSWORD = "Bustaniya@1122";

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
  const session = readAdminSessionValue(request.cookies?.get(ADMIN_COOKIE_NAME)?.value || "");
  if (!session) {
    throw Object.assign(new Error("Admin session is required."), { status: 401 });
  }

  const user = await findAdminUser(session.userId);
  if (!user || user.status !== "Active") {
    throw Object.assign(new Error("Admin user is not active."), { status: 401 });
  }
  if (!hasAdminPermission(user, permission)) {
    throw Object.assign(new Error("You do not have access to this admin area."), { status: 403 });
  }
  return { user, session };
}

export async function authorizeAdminRequest(request, permission = "") {
  const { user } = await authorizeAdminSession(request, permission);

  const accessKey = request.headers.get("x-admin-access-key")?.trim();
  if (!accessKey) {
    throw Object.assign(new Error("Admin access key is required."), { status: 401 });
  }

  const valid = await supabaseAdminRpc("admin_verify_orders_key", { access_key: accessKey });
  if (!valid) {
    throw Object.assign(new Error("Invalid admin access key."), { status: 403 });
  }

  return { accessKey, user };
}

export function adminAuthErrorResponse(error) {
  const status = error?.status === 403 ? 403 : 401;
  return {
    error: error?.message || "Admin authorization failed.",
    status,
  };
}
