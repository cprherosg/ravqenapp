import { NextResponse } from "next/server";
import { createPublicServerSupabaseClient } from "@/lib/supabase/public-server";
import { getAuthCookieNames, getSharedAuthCookieDomain } from "@/lib/supabase/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required." },
      { status: 400 },
    );
  }

  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? "Unable to sign in." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true });
  const cookieNames = getAuthCookieNames();
  const hostname = new URL(request.url).hostname;
  const cookieDomain = getSharedAuthCookieDomain(hostname);

  response.cookies.set(cookieNames.access, data.session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: data.session.expires_in,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  response.cookies.set(cookieNames.refresh, data.session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  return response;
}
