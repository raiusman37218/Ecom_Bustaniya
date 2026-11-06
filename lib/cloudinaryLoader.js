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
  // Quality and zoom are decided once per slot in CLOUDINARY_IMAGE_PRESETS.
  // Read them back off the stored transform instead of re-deciding here, so a
  // card stays `auto:eco` and the product hero stays `auto:good` at every
  // candidate width in the srcset.
  const quality = get("q");
  const zoom = get("z");
  if (!w || !h || !crop || crop === "limit") {
    return { ratio: null, crop: null, gravity: null, quality, zoom: null };
  }
  return { ratio: h / w, crop, gravity: get("g"), quality, zoom };
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

    // The preset's own quality wins; an explicit `quality` prop on the call
    // site overrides it; 75/80 means next/image was told nothing, so fall
    // back to auto:good.
    const explicit = quality && quality !== 75 && quality !== 80 ? quality : null;
    const q = explicit || preset?.quality || "auto:good";
    const parts = ["f_auto", "fl_lossy.progressive", `q_${q}`, `w_${w}`];
    if (preset?.ratio && preset.crop) {
      parts.push(`h_${Math.round(w * preset.ratio)}`, `c_${preset.crop}`);
      if (preset.gravity) parts.push(`g_${preset.gravity}`);
      if (preset.zoom) parts.push(`z_${preset.zoom}`);
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

  // Local public assets: return src directly so browser loads and caches without 404
  if (src.startsWith("/") && !src.startsWith("//")) {
    return src;
  }

  return src;
}
