export function optimizedImageUrl(src, width = 1600) {
  if (!src || typeof src !== "string") return src;
  if (!src.includes("res.cloudinary.com") || !src.includes("/image/upload/")) return src;
  if (src.includes("/f_auto,") || src.includes("/q_auto")) return src;
  return src.replace("/image/upload/", `/image/upload/f_auto,q_auto:good,c_limit,w_${width}/`);
}
