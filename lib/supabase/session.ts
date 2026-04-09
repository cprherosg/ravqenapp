import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const ACCESS_COOKIE = "ravqen-access-token";
const REFRESH_COOKIE = "ravqen-refresh-token";

function createServerSessionClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function createServerAuthedSupabaseClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const supabase = createServerSessionClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return null;
  }

  return supabase;
}

export async function getServerAuthUser() {
  const supabase = await createServerAuthedSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export function getAuthCookieNames() {
  return {
    access: ACCESS_COOKIE,
    refresh: REFRESH_COOKIE,
  };
}

function isIpv4Hostname(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function getSharedAuthCookieDomain(hostname: string) {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (
    !normalizedHostname ||
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    isIpv4Hostname(normalizedHostname)
  ) {
    return undefined;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    try {
      const appHostname = new URL(appUrl).hostname.toLowerCase();

      if (
        appHostname &&
        appHostname !== "localhost" &&
        !appHostname.endsWith(".localhost") &&
        !isIpv4Hostname(appHostname)
      ) {
        return `.${appHostname.replace(/^www\./, "")}`;
      }
    } catch {
      // Fall back to the current hostname if NEXT_PUBLIC_APP_URL is malformed.
    }
  }

  const labels = normalizedHostname.replace(/^www\./, "").split(".");

  if (labels.length < 2) {
    return undefined;
  }

  return `.${labels.slice(-2).join(".")}`;
}
