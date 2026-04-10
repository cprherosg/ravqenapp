import { cookies } from "next/headers";
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
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

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
