const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

/** Admin stores ordinary Cloudinary URLs; delivery is optimized per rendered slot. */
export const CLOUDINARY_IMAGE_PRESETS = Object.freeze({
  card: { width: 640, height: 900, crop: "fill", gravity: "auto" },
  category: { width: 720, height: 960, crop: "fill", gravity: "auto" },
  heroDesktop: { width: 1920, height: 900, crop: "fill", gravity: "auto" },
  heroMobile: { width: 900, height: 1125, crop: "fill", gravity: "auto" },
  product: { width: 1440, crop: "limit" },
  thumbnail: { width: 240, height: 320, crop: "fill", gravity: "auto" },
});

function transformParts({ width, height, crop = "limit", gravity, quality = "auto:good", format = "auto" }) {
  const parts = [`f_${format}`, `q_${quality}`, "dpr_auto"];
  if (width) parts.push(`w_${Math.round(width)}`);
  if (height) parts.push(`h_${Math.round(height)}`);
  if (crop) parts.push(`c_${crop}`);
  if (gravity && crop !== "limit") parts.push(`g_${gravity}`);
  return parts.join(",");
}

export function optimizedImageUrl(src, presetOrWidth = CLOUDINARY_IMAGE_PRESETS.product) {
  if (!src || typeof src !== "string") return src;
  if (!src.includes("res.cloudinary.com") || !src.includes(CLOUDINARY_UPLOAD_MARKER)) return src;

  const options = typeof presetOrWidth === "number"
    ? { ...CLOUDINARY_IMAGE_PRESETS.product, width: presetOrWidth }
    : { ...CLOUDINARY_IMAGE_PRESETS.product, ...(presetOrWidth || {}) };

  // A first transformation component is safe even if the stored URL already has one.
  return src.replace(CLOUDINARY_UPLOAD_MARKER, `${CLOUDINARY_UPLOAD_MARKER}${transformParts(options)}/`);
}
