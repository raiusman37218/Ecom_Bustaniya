const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

/** Admin stores ordinary Cloudinary URLs; delivery is optimized per rendered slot. */
export const CLOUDINARY_IMAGE_PRESETS = Object.freeze({
  card: { width: 640, height: 900, crop: "fill", gravity: "auto" },
  category: { width: 720, height: 960, crop: "fill", gravity: "auto" },
  heroDesktop: { width: 1920, height: 800, crop: "fill", gravity: "auto" },
  heroMobile: { width: 1080, height: 1350, crop: "fill", gravity: "auto" },
  product: { width: 1080, crop: "limit" },
  thumbnail: { width: 240, height: 320, crop: "fill", gravity: "auto" },
  searchThumb: { width: 120, height: 150, crop: "fill", gravity: "auto" },
  // Full-body product photos leave a lot of plain backdrop around the model;
  // a plain fill crop for a small circular avatar mostly shows that backdrop.
  // c_thumb with a zoom factor crops in on the detected subject instead.
  circleThumb: { width: 500, height: 500, crop: "thumb", gravity: "auto", zoom: 1.3 },
});

/**
 * Segments before the version/public id are transformation components:
 * comma-joined `key_value` pairs. The version segment is `v` + digits.
 */
function isTransformSegment(segment) {
  if (!segment) return false;
  if (/^v\d+$/.test(segment)) return false;
  return segment.split(",").every((part) => /^[a-z]{1,3}_[^/]+$/i.test(part));
}

/**
 * Product and banner URLs are stored with a transformation already baked in.
 * Inserting another in front chains them, so Cloudinary renders the stored
 * derivative and then resizes it again. Drop what is there and state the
 * delivery size once.
 */
export function stripCloudinaryTransform(pathAfterUpload) {
  const segments = pathAfterUpload.split("/");
  let index = 0;
  while (index < segments.length && isTransformSegment(segments[index])) index += 1;
  return segments.slice(index).join("/");
}

function transformParts({ width, height, crop = "limit", gravity, zoom, quality = "auto", format = "auto" }) {
  // `fl_lossy` applies lossy optimization to heavy PNG uploads (dropping sizes by 50-80%).
  // `f_auto,q_auto` lets Cloudinary select optimal AVIF/WebP per user browser.
  const parts = [`f_${format}`, "fl_lossy", `q_${quality}`];
  if (width) parts.push(`w_${Math.round(width)}`);
  if (height) parts.push(`h_${Math.round(height)}`);
  if (crop) parts.push(`c_${crop}`);
  if (gravity && crop !== "limit") parts.push(`g_${gravity}`);
  if (zoom && crop !== "limit") parts.push(`z_${zoom}`);
  return parts.join(",");
}

export function optimizedImageUrl(src, presetOrWidth = CLOUDINARY_IMAGE_PRESETS.product) {
  if (!src || typeof src !== "string") return src;
  if (!src.includes("res.cloudinary.com") || !src.includes(CLOUDINARY_UPLOAD_MARKER)) return src;

  const options = typeof presetOrWidth === "number"
    ? { ...CLOUDINARY_IMAGE_PRESETS.product, width: presetOrWidth }
    : { ...CLOUDINARY_IMAGE_PRESETS.product, ...(presetOrWidth || {}) };

  const [prefix, rest] = src.split(CLOUDINARY_UPLOAD_MARKER);
  return `${prefix}${CLOUDINARY_UPLOAD_MARKER}${transformParts(options)}/${stripCloudinaryTransform(rest)}`;
}
