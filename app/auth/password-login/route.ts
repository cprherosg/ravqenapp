import { NextResponse } from "next/server";
import { createPublicServerSupabaseClient } from "@/lib/supabase/public-server";
import {
  getAuthCookieDomain,
  getAuthCookieNames,
  getLegacyAuthCookieNames,
} from "@/lib/supabase/session";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isJsonRequest = contentType.includes("application/json");
  const body = isJsonRequest
    ? ((await request.json()) as { email?: string; password?: string })
    : Object.fromEntries(await request.formData());
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const loginUrl = new URL("/login", request.url);

  if (!email || !password) {
    if (isJsonRequest) {
      return NextResponse.json(
        { ok: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    loginUrl.searchParams.set("error", "Email and password are required.");
    return NextResponse.redirect(loginUrl, 303);
  }

  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    const message = error?.message ?? "Unable to sign in.";

    if (isJsonRequest) {
      return NextResponse.json(
        { ok: false, message },
        { status: 400 },
      );
    }

    loginUrl.searchParams.set("error", message);
    return NextResponse.redirect(loginUrl, 303);
  }

  const response = isJsonRequest
    ? NextResponse.json({ ok: true })
    : new NextResponse(
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=/player" />
    <title>Signing you in…</title>
  </head>
  <body style="font-family:system-ui,sans-serif;background:#041014;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;">
    <p>Signing you in… If you are not redirected automatically, <a href="/player" style="color:#67e8f9;">continue to Ravqen</a>.</p>
    <script>window.location.replace('/player');</script>
  </body>
</html>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
  const cookieNames = getAuthCookieNames();
  const legacyCookieNames = getLegacyAuthCookieNames();
  const cookieDomain = getAuthCookieDomain();
  const secure = request.url.startsWith("https://");

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
