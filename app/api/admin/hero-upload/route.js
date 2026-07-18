import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";
import { requiredAnyEnv, requiredEnv } from "../../../../lib/env";

export const runtime = "nodejs";

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function validSignature(buffer, type) {
  if (type === "image/jpeg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/png") return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/webp") return buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

const HERO_BUCKET = "bustaniya-hero";

function storageConfig() {
  return {
    url: requiredEnv("SUPABASE_URL").replace(/\/$/, ""),
    key: requiredAnyEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY"]),
  };
}

function storageHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function ensureHeroBucket(url, key) {
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: storageHeaders(key, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      id: HERO_BUCKET,
      name: HERO_BUCKET,
      public: true,
      file_size_limit: 12 * 1024 * 1024,
      allowed_mime_types: [...allowedTypes.keys()],
    }),
    cache: "no-store",
  });
  if (response.ok || response.status === 409) return;
  const result = await response.json().catch(() => null);
  throw new Error(result?.message || result?.error || "Unable to prepare image storage.");
}

export async function POST(request) {
  try {
    await authorizeAdminRequest(request, "settings");
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "Choose a hero image." }, { status: 400 });
    const extension = allowedTypes.get(file.type);
    if (!extension) return NextResponse.json({ error: "Upload a PNG, JPG or WEBP image." }, { status: 400 });
    if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Hero image must be under 12MB." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validSignature(bytes, file.type)) return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 400 });

    const { url, key } = storageConfig();
    await ensureHeroBucket(url, key);
    const objectPath = `hero/${Date.now()}-${randomUUID()}${extension}`;
    const uploadResponse = await fetch(`${url}/storage/v1/object/${HERO_BUCKET}/${objectPath}`, {
      method: "POST",
      headers: storageHeaders(key, { "Content-Type": file.type, "x-upsert": "false" }),
      body: bytes,
      cache: "no-store",
    });
    if (!uploadResponse.ok) {
      const result = await uploadResponse.json().catch(() => null);
      throw new Error(result?.message || result?.error || "Unable to upload hero image.");
    }
    return NextResponse.json({ url: `${url}/storage/v1/object/public/${HERO_BUCKET}/${objectPath}` });
  } catch (error) {
    const status = error.status === 401 || error.status === 403 ? error.status : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to upload hero image." : error.message }, { status });
  }
}
