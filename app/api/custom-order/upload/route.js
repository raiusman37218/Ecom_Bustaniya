import { randomUUID, createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { optionalEnv } from "../../../../lib/env";

export const runtime = "nodejs";

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function hasValidImageSignature(buffer, type) {
  if (type === "image/jpeg") {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (type === "image/png") {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (type === "image/webp") {
    return (
      buffer.length > 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

function cloudinaryConfig() {
  const cloudName = optionalEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = optionalEnv("CLOUDINARY_API_KEY");
  const apiSecret = optionalEnv("CLOUDINARY_API_SECRET");
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  try {
    const connection = new URL(optionalEnv("CLOUDINARY_URL"));
    if (connection.protocol === "cloudinary:" && connection.hostname && connection.username && connection.password) {
      return {
        cloudName: connection.hostname,
        apiKey: decodeURIComponent(connection.username),
        apiSecret: decodeURIComponent(connection.password),
      };
    }
  } catch {}
  return null;
}

async function uploadToCloudinary(file, bytes, config) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "bustaniya/custom-orders";
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${config.apiSecret}`)
    .digest("hex");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: file.type }), file.name || `custom-${timestamp}`);
  form.append("folder", folder);
  form.append("timestamp", String(timestamp));
  form.append("api_key", config.apiKey);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.secure_url) {
    throw new Error(result?.error?.message || "Cloudinary upload failed");
  }
  return result.secure_url;
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files");
    if (!files.length) {
      return NextResponse.json({ error: "Please choose at least one image." }, { status: 400 });
    }
    if (files.length > 6) {
      return NextResponse.json({ error: "You can upload up to 6 reference photos." }, { status: 400 });
    }

    const cloudinary = cloudinaryConfig();
    const urls = [];

    const uploadDir = path.join(process.cwd(), "public", "custom-uploads");
    if (!cloudinary) {
      await mkdir(uploadDir, { recursive: true });
    }

    for (const file of files) {
      const extension = allowedTypes.get(file.type);
      if (!extension) {
        return NextResponse.json({ error: "Only JPG, PNG and WEBP photos are allowed." }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `${file.name} is larger than 10MB.` }, { status: 400 });
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      if (!hasValidImageSignature(bytes, file.type)) {
        return NextResponse.json({ error: `${file.name} is not a valid image file.` }, { status: 400 });
      }

      if (cloudinary) {
        try {
          const url = await uploadToCloudinary(file, bytes, cloudinary);
          urls.push(url);
          continue;
        } catch (cloudErr) {
          console.warn("Cloudinary upload failed, falling back to local storage:", cloudErr.message);
          await mkdir(uploadDir, { recursive: true });
        }
      }

      const filename = `custom-${Date.now()}-${randomUUID()}${extension}`;
      await writeFile(path.join(uploadDir, filename), bytes);
      urls.push(`/custom-uploads/${filename}`);
    }

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Custom order upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload reference photos." },
      { status: 500 }
    );
  }
}
