import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionValue,
} from "../../../../lib/adminAuth";
import { authenticateAdminUser } from "../../../../lib/adminUsers";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();
const OWNER_PERMISSIONS = [
  "dashboard",
  "orders",
  "products",
  "inventory",
  "customers",
  "settings",
  "users",
];

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function isLimited(key) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return null;
  }
  return record.count >= MAX_ATTEMPTS ? record : null;
}

function recordFailure(key) {
  const now = Date.now();
  const record = attempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  attempts.set(key, {
    count: record.count + 1,
    resetAt: record.resetAt > now ? record.resetAt : now + WINDOW_MS,
  });
}

function clearFailures(key) {
  attempts.delete(key);
}

function envOwnerUser(email = "") {
  return {
    id: "owner",
    name: process.env.ADMIN_NAME || "Owner",
    email: email || process.env.ADMIN_EMAIL || "owner@bustaniya.local",
    role: "Owner",
    permissions: OWNER_PERMISSIONS,
    status: "Active",
  };
}

function isSecureRequest(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.nextUrl?.protocol?.replace(":", "");
  return protocol === "https";
}

export async function POST(request) {
  try {
    const key = clientKey(request);
    const limited = isLimited(key);
    if (limited) {
      const retryAfterSeconds = Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).` },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const { email, password } = await request.json().catch(() => ({}));
    const submittedEmail = String(email || "").trim().toLowerCase();
    const submittedPassword = String(password || "").trim();
    if (!process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json(
        { error: "Admin session signing is not configured." },
        { status: 500 }
      );
    }
    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Admin password is not configured." },
        { status: 500 }
      );
    }

    let user = await authenticateAdminUser({ email: submittedEmail, password: submittedPassword });
    if (!user && submittedPassword === String(process.env.ADMIN_PASSWORD || "").trim()) {
      user = envOwnerUser(submittedEmail);
    }
    if (!user) {
      recordFailure(key);
      return NextResponse.json({ error: "Invalid admin login." }, { status: 401 });
    }

    clearFailures(key);
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionValue(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Admin login failed." },
      { status: 500 }
    );
  }
}
