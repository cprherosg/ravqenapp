import { NextResponse } from "next/server";
import { createPublicServerSupabaseClient } from "@/lib/supabase/public-server";
import { getAuthCookieNames, getLegacyAuthCookieNames } from "@/lib/supabase/session";

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
    : NextResponse.redirect(new URL("/player", request.url), 303);
  const cookieNames = getAuthCookieNames();
  const legacyCookieNames = getLegacyAuthCookieNames();

  response.cookies.set(cookieNames.access, data.session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: data.session.expires_in,
  });
  response.cookies.set(cookieNames.refresh, data.session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  response.cookies.set(legacyCookieNames.access, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(legacyCookieNames.refresh, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: 0,
  });

  return response;
}
