type AdminIdentityBannerProps = {
  fullName: string | null;
  email: string | null;
};

export function AdminIdentityBanner({
  fullName,
  email,
}: AdminIdentityBannerProps) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100">
        Signed In As Admin
      </p>
      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{fullName?.trim() || "Ravqen admin"}</p>
          <p className="mt-1 text-xs text-stone-400">{email ?? "No email available"}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-200">
          Live admin session
        </div>
      </div>
    </div>
  );
}
