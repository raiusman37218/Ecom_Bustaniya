import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";

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

    const uploadDir = path.join(process.cwd(), "public", "hero-uploads");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    await writeFile(path.join(uploadDir, filename), bytes);
    return NextResponse.json({ url: `/hero-uploads/${filename}` });
  } catch (error) {
    const status = error.status === 401 || error.status === 403 ? error.status : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to upload hero image." : error.message }, { status });
  }
}
