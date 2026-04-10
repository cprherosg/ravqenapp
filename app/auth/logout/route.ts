import { NextResponse } from "next/server";
import {
  getAuthCookieDomain,
  getAuthCookieNames,
  getLegacyAuthCookieNames,
} from "@/lib/supabase/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/login", url.origin));
  const cookieNames = getAuthCookieNames();
  const legacyCookieNames = getLegacyAuthCookieNames();
  const cookieDomain = getAuthCookieDomain();

  response.cookies.set(cookieNames.access, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });
  response.cookies.set(cookieNames.refresh, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });
  response.cookies.set(legacyCookieNames.access, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });
  response.cookies.set(legacyCookieNames.refresh, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });

  return response;
}
