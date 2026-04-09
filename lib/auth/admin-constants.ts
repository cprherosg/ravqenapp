export const SUPER_ADMIN_EMAILS = [
  "xpurearchexx@gmail.com",
  "luqman@sgamts.com",
] as const;

export function isSuperAdminEmail(email: string | null | undefined) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.includes(
    normalizedEmail as (typeof SUPER_ADMIN_EMAILS)[number],
  );
}
