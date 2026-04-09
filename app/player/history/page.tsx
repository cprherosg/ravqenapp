import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlayerBootstrap } from "@/lib/repositories/workout-player";
import { getServerAuthUser } from "@/lib/supabase/session";

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function chartWidth(value: number | null) {
  if (!value) return "8%";
  return `${Math.max(8, value * 10)}%`;
}

export default async function PlayerHistoryPage() {
  const authUser = await getServerAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const bootstrap = await getPlayerBootstrap(authUser.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17353c_0%,#071015_38%,#020507_100%)] px-4 py-5 text-stone-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-24 lg:max-w-6xl lg:gap-5 lg:pb-0">
        <section className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Workout history</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Recent sessions</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-300">
                Review effort, movement trends, and saved training notes from your most recent Ravqen sessions.
              </p>
            </div>
            <Link
              href="/player"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
            >
              Back
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <HeroStat
            label="Completed this week"
            value={`${bootstrap.access.completedThisWeek}`}
            hint="Saved sessions in the current Singapore week."
          />
          <HeroStat
            label="Tracked movements"
            value={`${bootstrap.completionInsights.recentPerformanceSummary.trackedMovements}`}
            hint="Exercises with logged output or load."
          />
          <HeroStat
            label="Logged outputs"
            value={`${bootstrap.completionInsights.recentPerformanceSummary.loggedOutputs}`}
            hint="Completed reps, calories, or metres saved."
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel title="Weekly summary">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryLine
                label="Consistency badge"
                value={bootstrap.completionInsights.currentConsistencyBadge}
              />
              <SummaryLine
                label="Current streak"
                value={`${bootstrap.completionInsights.streakCount} day${bootstrap.completionInsights.streakCount === 1 ? "" : "s"}`}
              />
              <SummaryLine
                label="Top improver"
                value={bootstrap.completionInsights.recentPerformanceSummary.topImprovingMovement ?? "Not enough data yet"}
              />
              <SummaryLine
                label="Why this block matters"
                value={bootstrap.workout.scienceNote}
              />
            </div>
          </Panel>

          <Panel title="Progress chart">
            <div className="space-y-3">
              {bootstrap.completionInsights.progressChart.map((item, index) => (
                <div key={`${item.label}-${item.trackedExercises}-${item.rpe ?? "na"}-${index}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-stone-300">{item.label}</p>
                    <p className="text-xs font-semibold text-cyan-100">
                      RPE {item.rpe ?? "-"} • {item.trackedExercises} tracked
                    </p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#67e8f9_0%,#22d3ee_45%,#f59e0b_100%)]"
                      style={{ width: chartWidth(item.rpe) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Movement bests">
            <div className="space-y-3">
              {bootstrap.completionInsights.personalBests.movementBests.length ? (
                bootstrap.completionInsights.personalBests.movementBests.map((item) => (
                  <div
                    key={`${item.movement}-${item.loadLabel}`}
                    className="rounded-[1rem] border border-white/8 bg-black/20 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white">{item.movement}</p>
                      <p className="text-sm font-semibold text-cyan-100">{item.loadLabel}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-300">
                  Log movement + load like &quot;Split squat 18kg&quot; to build movement-level bests here.
                </p>
              )}
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel title="Performance summary">
            <div className="space-y-3">
              <SummaryLine
                label="Tracked movements"
                value={`${bootstrap.completionInsights.recentPerformanceSummary.trackedMovements}`}
              />
              <SummaryLine
                label="Logged outputs"
                value={`${bootstrap.completionInsights.recentPerformanceSummary.loggedOutputs}`}
              />
              <SummaryLine
                label="Top improver"
                value={bootstrap.completionInsights.recentPerformanceSummary.topImprovingMovement ?? "Not enough data yet"}
              />
            </div>
          </Panel>

          <Panel title="Movement load trends">
            <div className="space-y-4">
              {bootstrap.completionInsights.movementTrends.length ? (
                bootstrap.completionInsights.movementTrends.map((trend) => (
                  <div key={trend.movement}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white">{trend.movement}</p>
                      <p className="text-xs font-semibold text-cyan-100">
                        {trend.points.at(-1)?.load ?? 0} kg latest
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {trend.points.map((point, index) => (
                        <div key={`${trend.movement}-${point.label}-${index}`} className="flex-1">
                          <div
                            className="h-2 rounded-full bg-[linear-gradient(90deg,#67e8f9_0%,#22d3ee_45%,#f59e0b_100%)]"
                            style={{ width: `${Math.max(18, Math.min(100, point.load * 2))}%` }}
                          />
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-stone-500">
                            {point.load}kg
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-300">Movement load trends will appear after more logged sessions.</p>
              )}
            </div>
          </Panel>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Streak rhythm</p>
          <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
            {bootstrap.completionInsights.streakHistory.map((entry) => (
              <div key={entry.date} className="min-w-[4.5rem] space-y-2 text-center sm:min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{entry.label}</p>
                <div
                  className={`rounded-[1rem] border px-2 py-4 text-xs font-semibold ${
                    entry.completed
                      ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-50"
                      : "border-white/8 bg-black/20 text-stone-500"
                  }`}
                >
                  {entry.completed ? "Done" : "Rest"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Session log</p>
          <div className="mt-4 space-y-3">
            {bootstrap.completionInsights.recentFeedback.map((item, index) => (
              <article
                key={`${item.scheduledFor}-${item.workoutLabel}-${index}`}
                className="rounded-[1.35rem] border border-white/8 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.workoutLabel}</p>
                    <p className="mt-1 text-xs text-stone-400">{formatSessionDate(item.scheduledFor)}</p>
                  </div>
                  <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    RPE {item.rpe ?? "-"}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Load note</p>
                    <p className="mt-2 text-sm text-stone-100">{item.loadSummary ?? "No load note saved"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Session note</p>
                    <p className="mt-2 text-sm text-stone-100">{item.notes ?? "No session note saved"}</p>
                  </div>
                </div>
                {item.exerciseEntries.length ? (
                  <div className="mt-3 grid gap-2">
                    {item.exerciseEntries
                      .filter((entry) => entry.achievedValue || entry.loadValue)
                      .slice(0, 4)
                      .map((entry) => (
                        <div
                          key={`${item.sessionId}-${entry.exerciseKey}`}
                          className="rounded-[1rem] border border-white/8 bg-[#071015] px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-white">{entry.exerciseName}</p>
                            <p className="text-xs font-semibold text-cyan-100">
                              {entry.achievedValue ?? entry.targetLabel}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-stone-400">
                            Load: {entry.loadValue ?? "Not logged"}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : null}
              </article>
            ))}
            {!bootstrap.completionInsights.recentFeedback.length ? (
              <div className="rounded-[1.35rem] border border-white/8 bg-black/20 px-4 py-4 text-sm text-stone-300">
                No workouts saved yet. Once sessions are completed, this page becomes your training log.
              </div>
            ) : null}
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#020507]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
          <div className="mx-auto w-full max-w-md">
            <Link
              href="/player"
              className="block rounded-full border border-white/10 bg-white/5 px-5 py-4 text-center text-base font-semibold text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function HeroStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-stone-300">{hint}</p>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/20 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
