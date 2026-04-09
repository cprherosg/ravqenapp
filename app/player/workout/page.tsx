import { redirect } from "next/navigation";
import { WorkoutPlayer } from "@/components/workout-player";
import { getPlayerBootstrap } from "@/lib/repositories/workout-player";
import { getServerAuthUser } from "@/lib/supabase/session";

export default async function WorkoutSessionPage() {
  const authUser = await getServerAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const bootstrap = await getPlayerBootstrap(authUser.id);

  if (bootstrap.legal.required) {
    redirect("/player/legal");
  }

  return (
    <WorkoutPlayer
      workout={bootstrap.workout}
      activeMember={bootstrap.activeMember}
      members={bootstrap.members}
      sessionId={bootstrap.sessionId}
      legal={bootstrap.legal}
      access={bootstrap.access}
      completionInsights={bootstrap.completionInsights}
    />
  );
}
