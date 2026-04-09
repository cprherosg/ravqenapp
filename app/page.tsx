import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { getAdminAccess } from "@/lib/auth/admin";
import { getLaunchPlans } from "@/lib/billing";
import { DEFAULT_PROGRAM_GROUPS } from "@/lib/program-catalog";
import { getServerAuthUser } from "@/lib/supabase/session";
import {
  getProgrammingStudioBootstrap,
  getPersistedCurrentWeekSchedule,
  getPersistedWorkoutForDate,
} from "@/lib/repositories/programming";
import { getAdminMembers } from "@/lib/repositories/admin-members";
import { getProgrammingEngineSnapshot } from "@/lib/training-engine";

const coreBenefits = [
  "Guided daily workouts you can open any time that day.",
  "Structured programming inspired by premium group training, but original to Ravqen.",
  "Warm-up, work blocks, transitions, cooldown, and recap in one mobile flow.",
];

const memberJourney = [
  {
    title: "Open member home",
    body: "See today’s session, your streak, sessions used, and what’s coming next.",
  },
  {
    title: "Start the workout",
    body: "Follow a guided session with timers, media demos, and clear transitions.",
  },
  {
    title: "Save and continue",
    body: "Log effort and load so the next sessions stay relevant instead of random.",
  },
];

export default async function Home() {
  const pricingTiers = getLaunchPlans();
  const [workoutOfTheDay, weeklySchedule, authUser, members, adminAccess, programmingBootstrap] = await Promise.all([
    getPersistedWorkoutForDate(),
    getPersistedCurrentWeekSchedule(),
    getServerAuthUser(),
    getAdminMembers(),
    getAdminAccess(),
    getProgrammingStudioBootstrap(),
  ]);

  const signedInMember = authUser
    ? members.find((member) => member.id === authUser.id) ?? null
    : null;
  const canAccessAdmin = adminAccess.ok;
  const engine = getProgrammingEngineSnapshot();

  const activePrograms = programmingBootstrap.programs.filter((program) => program.status !== "archived");
  const discoveredGroups = Array.from(new Set(activePrograms.map((program) => program.group)));
  const orderedGroups = [
    ...DEFAULT_PROGRAM_GROUPS.filter((group) => discoveredGroups.includes(group)),
    ...discoveredGroups.filter(
      (group) => !DEFAULT_PROGRAM_GROUPS.includes(group as (typeof DEFAULT_PROGRAM_GROUPS)[number]),
    ),
  ];
  const groupedPrograms = orderedGroups
    .map((group) => ({
      title: group,
      items: activePrograms.filter((program) => program.group === group).map((program) => program.category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1f646a_0%,#081215_40%,#030607_100%)] text-stone-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-20 pt-6 sm:max-w-6xl sm:px-8">
        <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,25,29,0.92)_0%,rgba(7,15,18,0.98)_100%)] p-6 shadow-2xl shadow-black/30 md:p-10">
          <div className="absolute -left-16 top-0 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute right-0 top-12 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Ravqen
              </div>
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.28em] text-stone-300">
                  Structured solo training for commercial gyms
                </p>
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                  Train with the clarity of a coached class, without being tied to class times.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
                  Ravqen gives members a guided daily workout with warm-up, timed work, transitions,
                  cooldown, and the structure that keeps people consistent over time.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={signedInMember ? "/player" : "/login"}
                  className="flex items-center justify-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  {signedInMember ? "Open Member Home" : "Log in to Ravqen"}
                </Link>
                <Link
                  href="/plans"
                  className="flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View plans
                </Link>
                {canAccessAdmin ? (
                  <Link
                    href="/admin"
                    className="flex items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/15"
                  >
                    Open Admin Console
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {coreBenefits.map((benefit) => (
                  <article
                    key={benefit}
                    className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-stone-100"
                  >
                    {benefit}
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Today in Ravqen</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{workoutOfTheDay.category}</h2>
                </div>
                <div className="rounded-[1rem] border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100">Session</p>
                  <p className="mt-1 text-base font-semibold text-white">{workoutOfTheDay.estimatedDurationMin} min</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-7 text-stone-300">{workoutOfTheDay.focus}</p>

              <div className="mt-4 rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,#ebf8ff_0%,#c7e8ff_100%)] p-4 text-slate-950">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">In-session view</p>
                    <p className="mt-2 text-lg font-semibold">Cycle 2 / 4</p>
                  </div>
                  <p className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">Rest 0:20</p>
                </div>
                <div className="mt-4 rounded-[1.3rem] bg-slate-950/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-600">Next up</p>
                  <p className="mt-2 text-xl font-semibold">Rear-foot elevated split squat</p>
                  <p className="mt-1 text-sm text-slate-700">10 reps • Dumbbells • Main session</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[2rem] border border-white/10 bg-[#091417] p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">A simpler member journey</h2>
            <div className="mt-5 space-y-3">
              {memberJourney.map((step) => (
                <div key={step.title} className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-300">{step.body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">This week</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">A rotating weekly schedule</h2>
            <div className="mt-5 space-y-3">
              {weeklySchedule.map((day) => (
                <div
                  key={`${day.weekIndex}-${day.day}`}
                  className="flex items-center justify-between rounded-[1.5rem] border border-white/8 bg-black/20 px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{day.day}</p>
                    <p className="mt-1 text-xs text-stone-400">{day.category}</p>
                  </div>
                  <p className="max-w-[12rem] text-right text-xs leading-6 text-stone-300">{day.focus}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section id="plans" className="mt-10">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">Plans</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Membership structure</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article key={tier.name} className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">{tier.name}</p>
                <h3 className="mt-3 text-3xl font-semibold text-white">{tier.priceLabel}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{tier.summary}</p>
                <Link
                  href="/plans"
                  className="mt-5 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  See plan details
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">Program library</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Built around rotating categories</h2>
            <div className="mt-5 space-y-4">
              {groupedPrograms.map((group) => (
                <div key={group.title} className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">{group.title}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-200">{group.items.join(" • ")}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-[#11161a] p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">Programming engine</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">How Ravqen keeps training relevant</h2>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <EngineStat label="Block" value={engine.blockName} />
              <EngineStat label="Week" value={engine.blockWeekLabel} />
              <EngineStat label="Phase" value={engine.phaseLabel} />
            </div>
            <div className="mt-5 space-y-3">
              <EngineRule title="Progression" body={engine.progressionFocus} />
              <EngineRule title="Adaptation" body={engine.adaptationRule} />
              <EngineRule title="Substitutions" body={engine.substitutionRule} />
              <EngineRule title="Media" body={engine.mediaPipeline} />
            </div>
          </article>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}

function EngineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-3 py-3 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function EngineRule({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-stone-300">{body}</p>
    </div>
  );
}
