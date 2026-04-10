import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const ACCESS_COOKIE = "ravqen-v2-access-token";
const REFRESH_COOKIE = "ravqen-v2-refresh-token";
const LEGACY_ACCESS_COOKIE = "ravqen-access-token";
const LEGACY_REFRESH_COOKIE = "ravqen-refresh-token";

function createServerSessionClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getServerAuthUser() {
  const headerStore = await headers();
  const cookieHeader = headerStore.get("cookie") ?? "";
  const accessToken = getCookieValue(cookieHeader, ACCESS_COOKIE);

  if (!accessToken) {
    return null;
  }

  const supabase = createServerSessionClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

function getCookieValue(cookieHeader: string, name: string) {
  const prefix = `${name}=`;

  for (const part of cookieHeader.split(";")) {
    const value = part.trim();

    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }

  return null;
}

export function getAuthCookieNames() {
  return {
    access: ACCESS_COOKIE,
    refresh: REFRESH_COOKIE,
  };
}

export function getLegacyAuthCookieNames() {
  return {
    access: LEGACY_ACCESS_COOKIE,
    refresh: LEGACY_REFRESH_COOKIE,
  };
}

export function getAuthCookieDomain() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!raw) {
    return undefined;
  }

  try {
    const host = new URL(raw).hostname;

    if (host === "localhost" || host.endsWith(".localhost") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return undefined;
    }

    return host;
  } catch {
    return undefined;
  }
}
