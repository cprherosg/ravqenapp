import { redirect } from "next/navigation";
import { MemberDashboard } from "@/components/member-dashboard";
import { getAdminAccess } from "@/lib/auth/admin";
import { getPlayerBootstrap } from "@/lib/repositories/workout-player";
import { getServerAuthUser } from "@/lib/supabase/session";

export default async function PlayerPage() {
  const authUser = await getServerAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const bootstrap = await getPlayerBootstrap(authUser.id);
  const adminAccess = await getAdminAccess();

  return (
    <MemberDashboard
      workout={bootstrap.workout}
      activeMember={bootstrap.activeMember}
      isAdmin={adminAccess.ok}
      legal={bootstrap.legal}
      access={bootstrap.access}
      completionInsights={bootstrap.completionInsights}
    />
  );
}
