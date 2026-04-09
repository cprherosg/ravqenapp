import { NextResponse } from "next/server";
import { getAuthCookieNames, getSharedAuthCookieDomain } from "@/lib/supabase/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/login", url.origin));
  const cookieNames = getAuthCookieNames();
  const cookieDomain = getSharedAuthCookieDomain(url.hostname);

  response.cookies.set(cookieNames.access, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  response.cookies.set(cookieNames.refresh, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  return response;
}
