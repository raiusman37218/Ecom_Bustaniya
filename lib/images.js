const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

/** Admin stores ordinary Cloudinary URLs; delivery is optimized per rendered slot. */
export const CLOUDINARY_IMAGE_PRESETS = Object.freeze({
  card: { width: 640, height: 900, crop: "fill", gravity: "auto" },
  category: { width: 720, height: 960, crop: "fill", gravity: "auto" },
  heroDesktop: { width: 1920, height: 900, crop: "fill", gravity: "auto" },
  heroMobile: { width: 900, height: 1125, crop: "fill", gravity: "auto" },
  product: { width: 1440, crop: "limit" },
  thumbnail: { width: 240, height: 320, crop: "fill", gravity: "auto" },
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

function transformParts({ width, height, crop = "limit", gravity, zoom, quality = "auto:good", format = "auto" }) {
  // No `dpr_auto`: every slot that matters now ships a real srcset, where the
  // browser already accounts for device pixel ratio — letting Cloudinary scale
  // again on top would serve two to three times the requested width. On the
  // single-URL uses left (CSS backgrounds) it needs Accept-CH client hints,
  // which are not configured, so it was doing nothing there either.
  const parts = [`f_${format}`, `q_${quality}`];
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
