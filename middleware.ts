import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getCanonicalHost() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!raw) {
    return null;
  }

  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const canonicalHost = getCanonicalHost();

  if (!canonicalHost) {
    return NextResponse.next();
  }

  const requestHost = request.headers.get("host");

  if (!requestHost || requestHost === canonicalHost) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.host = canonicalHost;
  url.protocol = canonicalHost.includes("localhost") ? "http" : "https";

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
