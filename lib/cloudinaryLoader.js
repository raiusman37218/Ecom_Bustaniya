import { stripCloudinaryTransform } from "./images.js";

const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

/**
 * The transform components the loader must replace, and the version + public
 * id it must preserve.
 */
function splitTransform(pathAfterUpload) {
  const path = stripCloudinaryTransform(pathAfterUpload);
  const consumed = pathAfterUpload.slice(0, pathAfterUpload.length - path.length);
  return { transforms: consumed.split("/").filter(Boolean), path };
}

/**
 * CLOUDINARY_IMAGE_PRESETS already encodes each slot's intended shape
 * (`w_640,h_900,c_fill,g_auto` for a card). Rather than throwing that away and
 * falling back to `c_limit` — which ships the photo's full height and lets CSS
 * discard ~17% of it — re-apply the same crop at the candidate width.
 */
function cropFromPreset(transforms) {
  const first = transforms[0];
  if (!first) return null;
  const parts = first.split(",");
  const get = (key) => {
    const hit = parts.find((part) => part.startsWith(`${key}_`));
    return hit ? hit.slice(key.length + 1) : null;
  };
  const crop = get("c");
  const w = Number(get("w"));
  const h = Number(get("h"));
  if (!w || !h || !crop || crop === "limit") return null;
  return { ratio: h / w, crop, gravity: get("g") };
}

/**
 * next/image loader. Next calls it once per candidate width and assembles the
 * srcset, so the browser downloads the size the slot actually needs instead of
 * one desktop-sized file everywhere.
 *
 * Deliberately no `dpr_auto`: with a real srcset the browser already accounts
 * for device pixel ratio, and letting Cloudinary scale again on top would serve
 * images at two to three times the requested width.
 */
export default function cloudinaryLoader({ src, width, quality }) {
  if (!src || typeof src !== "string") return src;

  if (src.includes("res.cloudinary.com") && src.includes(CLOUDINARY_UPLOAD_MARKER)) {
    const [prefix, rest] = src.split(CLOUDINARY_UPLOAD_MARKER);
    const { transforms, path } = splitTransform(rest);
    const preset = cropFromPreset(transforms);
    const w = Math.round(width);

    const parts = ["f_auto", `q_${quality || "auto"}`, `w_${w}`];
    if (preset) {
      parts.push(`h_${Math.round(w * preset.ratio)}`, `c_${preset.crop}`);
      if (preset.gravity) parts.push(`g_${preset.gravity}`);
    } else {
      parts.push("c_limit");
    }
    return `${prefix}${CLOUDINARY_UPLOAD_MARKER}${parts.join(",")}/${path}`;
  }

  // Unsplash serves its own resizing parameters; honour the requested width.
  if (src.includes("images.unsplash.com")) {
    const url = new URL(src);
    url.searchParams.set("w", String(Math.round(width)));
    url.searchParams.set("q", String(quality || 75));
    url.searchParams.set("auto", "format");
    return url.toString();
  }

  // Local files still go through Next's own optimizer endpoint, exactly as the
  // default loader would — a global custom loader replaces it everywhere, so
  // this branch keeps /public assets optimized instead of served raw.
  if (src.startsWith("/") && !src.startsWith("//")) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=${Math.round(width)}&q=${quality || 75}`;
  }

  return src;
}
