import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerAuthUser } from "@/lib/supabase/session";

export async function getAdminAccess() {
  const authUser = await getServerAuthUser();

  if (!authUser) {
    return {
      ok: false as const,
      reason: "unauthenticated" as const,
      userId: null,
      email: null,
      fullName: null,
    };
  }

  const supabase = createAdminSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,is_admin,full_name,email")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return {
      ok: false as const,
      reason: "forbidden" as const,
      userId: authUser.id,
      email: authUser.email ?? profile?.email ?? null,
      fullName: profile?.full_name ?? null,
    };
  }

  return {
    ok: true as const,
    userId: authUser.id,
    email: authUser.email ?? profile.email ?? null,
    fullName: profile.full_name ?? null,
  };
}

export async function requireAdminPageAccess() {
  const access = await getAdminAccess();

  if (!access.ok) {
    redirect(access.reason === "unauthenticated" ? "/login" : "/player");
  }

  return access;
}

export async function assertAdminActionAccess() {
  const access = await getAdminAccess();

  if (!access.ok) {
    throw new Error(
      access.reason === "unauthenticated"
        ? "You must be signed in to access the admin area."
        : "Only admin accounts can perform this action.",
    );
  }

  return access;
}
