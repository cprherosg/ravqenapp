import { AdminIdentityBanner } from "@/components/admin-identity-banner";
import { AdminConsole } from "@/components/admin-console";
import { AdminNav } from "@/components/admin-nav";
import {
  membershipTiers,
  workoutCategories,
} from "@/lib/admin-data";
import { requireAdminPageAccess } from "@/lib/auth/admin";
import { getAdminMembers } from "@/lib/repositories/admin-members";

export default async function AdminPage() {
  const adminAccess = await requireAdminPageAccess();
  const members = await getAdminMembers();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17383f_0%,#071015_45%,#020508_100%)] px-4 py-5 text-stone-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-[2rem] border border-cyan-300/12 bg-white/6 p-5 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
                Admin control
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Ravqen Membership Console
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-300">
                Manage member access, session limits, and gym-specific overrides from the
                membership side of the admin area.
              </p>
            </div>

            <AdminNav />
          </div>
          <div className="mt-4">
            <AdminIdentityBanner
              fullName={adminAccess.fullName}
              email={adminAccess.email}
            />
          </div>
        </section>

        <AdminConsole
          members={members}
          membershipTiers={membershipTiers}
          workoutCategories={workoutCategories}
        />
      </div>
    </main>
  );
}
