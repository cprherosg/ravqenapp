import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import {
  getAuthCookieDomain,
  getAuthCookieNames,
  getLegacyAuthCookieNames,
} from "@/lib/supabase/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", url.origin));
  }

  const response = NextResponse.redirect(new URL(next || "/player", url.origin));
  const cookieNames = getAuthCookieNames();
  const legacyCookieNames = getLegacyAuthCookieNames();
  const secure = url.protocol === "https:";
  const cookieDomain = getAuthCookieDomain();

  response.cookies.set(cookieNames.access, data.session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    domain: cookieDomain,
    maxAge: data.session.expires_in,
  });
  response.cookies.set(cookieNames.refresh, data.session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    domain: cookieDomain,
    maxAge: 60 * 60 * 24 * 30,
  });

  response.cookies.set(legacyCookieNames.access, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });
  response.cookies.set(legacyCookieNames.refresh, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });

  return response;
}
