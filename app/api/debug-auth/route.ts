import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getAuthCookieNames } from "@/lib/supabase/session";

export async function GET() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieNames = getAuthCookieNames();
  const accessToken = cookieStore.get(cookieNames.access)?.value ?? null;
  const refreshToken = cookieStore.get(cookieNames.refresh)?.value ?? null;

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : { data: { user: null }, error: null };

  return NextResponse.json({
    host: headerStore.get("host"),
    forwardedHost: headerStore.get("x-forwarded-host"),
    proto: headerStore.get("x-forwarded-proto"),
    cookieHeaderPresent: Boolean(headerStore.get("cookie")),
    accessCookiePresent: Boolean(accessToken),
    accessCookieLength: accessToken?.length ?? 0,
    refreshCookiePresent: Boolean(refreshToken),
    refreshCookieLength: refreshToken?.length ?? 0,
    userId: data.user?.id ?? null,
    userEmail: data.user?.email ?? null,
    error: error?.message ?? null,
  });
}
