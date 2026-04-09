import { redirect } from "next/navigation";
import { MemberLegalForm } from "@/components/member-legal-form";
import { getPlayerBootstrap } from "@/lib/repositories/workout-player";
import { getServerAuthUser } from "@/lib/supabase/session";

export default async function PlayerLegalPage() {
  const authUser = await getServerAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const bootstrap = await getPlayerBootstrap(authUser.id);

  if (!bootstrap.legal.required) {
    redirect("/player");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17383f_0%,#071015_45%,#020508_100%)] px-4 py-8 text-stone-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <section className="rounded-[2rem] border border-cyan-300/12 bg-white/6 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Before your first workout</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Complete your Ravqen acceptance</h1>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            Sign once for both documents, then your workouts will open normally from the member dashboard.
          </p>
        </section>

        <MemberLegalForm />
      </div>
    </main>
  );
}
