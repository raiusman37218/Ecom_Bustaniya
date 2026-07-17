import { requiredAnyEnv, requiredEnv } from "./env";

function supabaseUrl() {
  return requiredEnv("SUPABASE_URL");
}

function supabasePublishableKey() {
  return requiredAnyEnv(["SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
}

function supabaseServiceRoleKey() {
  return requiredAnyEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY"]);
}

async function requestWithKey(path, key, options = {}) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      result?.message || result?.error || "Supabase request failed."
    );
    error.status = response.status;
    error.details = result;
    throw error;
  }
  return result;
}

export async function supabaseRequest(path, options = {}) {
  return requestWithKey(path, supabasePublishableKey(), options);
}

export async function supabaseRpc(name, payload) {
  return supabaseRequest(`rpc/${name}`, { method: "POST", body: payload });
}

export async function supabaseAdminRequest(path, options = {}) {
  return requestWithKey(path, supabaseServiceRoleKey(), options);
}

export async function supabaseAdminRpc(name, payload) {
  return supabaseAdminRequest(`rpc/${name}`, { method: "POST", body: payload });
}
