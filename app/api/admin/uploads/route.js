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

function errorResponse(error) {
  const status = error.status || 500;
  return NextResponse.json(
    { error: status === 500 ? "Unable to upload product photos." : error.message },
    { status }
  );
}

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

export async function POST(request) {
  try {
    await authorizeAdminRequest(request, "products");
    const form = await request.formData();
    const files = form.getAll("files");
    if (!files.length) {
      return NextResponse.json({ error: "Choose at least one product photo." }, { status: 400 });
    }
    if (files.length > 8) {
      return NextResponse.json({ error: "You can upload up to 8 product photos." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "product-uploads");
    await mkdir(uploadDir, { recursive: true });

    const urls = [];
    for (const file of files) {
      const extension = allowedTypes.get(file.type);
      if (!extension) {
        return NextResponse.json({ error: "Please upload PNG, JPG or WEBP photos only." }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `${file.name} is larger than 10MB.` }, { status: 400 });
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      if (!hasValidImageSignature(bytes, file.type)) {
        return NextResponse.json({ error: `${file.name} is not a valid image file.` }, { status: 400 });
      }

      const filename = `${Date.now()}-${randomUUID()}${extension}`;
      await writeFile(path.join(uploadDir, filename), bytes);
      urls.push(`/product-uploads/${filename}`);
    }

    return NextResponse.json({ urls });
  } catch (error) {
    return errorResponse(error);
  }
}
