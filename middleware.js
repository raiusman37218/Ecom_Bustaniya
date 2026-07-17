import { NextResponse } from "next/server";

const canonicalHost = "bustaniya.com";

export function middleware(request) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host")?.toLowerCase() || "";
  const pathname = url.pathname;
  const lowerPathname = pathname.toLowerCase();

  if (
    process.env.NODE_ENV === "production" &&
    host &&
    !host.includes("localhost") &&
    !host.includes("127.0.0.1") &&
    host !== canonicalHost
  ) {
    url.protocol = "https:";
    url.host = canonicalHost;
  }

  if (pathname !== lowerPathname) {
    url.pathname = lowerPathname;
  }

  if (url.href !== request.nextUrl.href) {
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
