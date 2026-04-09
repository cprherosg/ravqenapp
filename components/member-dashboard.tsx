import Link from "next/link";
import type { MemberProfile } from "@/lib/admin-data";
import { getCanonicalAppHref } from "@/lib/app-url";
import type { DailyWorkout, ExercisePerformanceEntry } from "@/lib/types";

type MemberDashboardProps = {
  workout: DailyWorkout;
  activeMember: MemberProfile;
  isAdmin: boolean;
  legal: {
    required: boolean;
    waiverAccepted: boolean;
    termsAccepted: boolean;
  };
  access: {
    allowed: boolean;
    message: string | null;
    completedThisWeek: number;
  };
  completionInsights: {
    currentSessionsLeft: number;
    currentWeeklyUsed: number;
    currentConsistencyBadge: string;
    projectedSessionsLeft: number;
    projectedWeeklyUsed: number;
    weeklyLimit: number | null;
    streakCount: number;
    consistencyBadge: string;
    recentFeedback: Array<{
      sessionId: string;
      scheduledFor: string;
      workoutLabel: string;
      rpe: number | null;
      loadSummary: string | null;
      notes: string | null;
      exerciseEntries: ExercisePerformanceEntry[];
    }>;
    streakHistory: Array<{
      date: string;
      label: string;
      completed: boolean;
    }>;
    personalBests: {
      heaviestLoadLabel: string | null;
      highestRpe: number | null;
      movementBests: Array<{
        movement: string;
        loadLabel: string;
      }>;
    };
    progressChart: Array<{
      label: string;
      rpe: number | null;
      trackedExercises: number;
    }>;
    movementTrends: Array<{
      movement: string;
      points: Array<{
        label: string;
        load: number;
      }>;
    }>;
    recentPerformanceSummary: {
      trackedMovements: number;
      loggedOutputs: number;
      topImprovingMovement: string | null;
    };
    readiness: {
      status: string;
      summary: string;
      nextFocus: string;
    };
    lastCompletedWorkout: {
      sessionId: string;
      scheduledFor: string;
      workoutLabel: string;
      rpe: number | null;
      loadSummary: string | null;
      notes: string | null;
      exerciseEntries: ExercisePerformanceEntry[];
    } | null;
    tomorrowWorkout: {
      dayLabel: string;
      category: string;
      availableAt: string;
    };
  };
};

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function rpeBarWidth(value: number | null) {
  if (!value) return "12%";
  return `${Math.max(12, value * 10)}%`;
}

export function MemberDashboard({
  workout,
  activeMember,
  isAdmin,
  legal,
  access,
  completionInsights,
}: MemberDashboardProps) {
  const currentSessionsLeftLabel =
    activeMember.tierType === "monthly_unlimited"
      ? "Unlimited"
      : `${completionInsights.currentSessionsLeft}`;
  const latestRecentWorkout = completionInsights.recentFeedback[0] ?? null;
  const weeklySummaryLines = [
    `${access.completedThisWeek} session${access.completedThisWeek === 1 ? "" : "s"} completed this week`,
    `${completionInsights.recentPerformanceSummary.trackedMovements} tracked movement${completionInsights.recentPerformanceSummary.trackedMovements === 1 ? "" : "s"}`,
    completionInsights.recentPerformanceSummary.topImprovingMovement
      ? `Top improver: ${completionInsights.recentPerformanceSummary.topImprovingMovement}`
      : "Top improver: not enough data yet",
  ];
  const whyTodaySummary = completionInsights.recentPerformanceSummary.topImprovingMovement
    ? `Recent progress is building around ${completionInsights.recentPerformanceSummary.topImprovingMovement}. Today's session keeps that momentum moving while ${completionInsights.readiness.nextFocus.toLowerCase()}.`
    : workout.scienceNote;
  const primaryWorkoutHref = getCanonicalAppHref(legal.required ? "/player/legal" : "/player/workout");
  const historyHref = getCanonicalAppHref("/player/history");
  const legalHref = getCanonicalAppHref("/player/legal");
  const adminHref = getCanonicalAppHref("/admin");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17353c_0%,#071015_38%,#020507_100%)] px-4 py-5 text-stone-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 lg:max-w-6xl lg:gap-5 pb-24 lg:pb-0">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="self-start rounded-[1.8rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Member home</p>
                <p className="mt-1 text-xl font-semibold text-white">{activeMember.name}</p>
                <p className="mt-1 text-xs text-stone-400">{activeMember.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-50">
                    {activeMember.tierLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-200">
                    {activeMember.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {isAdmin ? (
                  <Link
                    href={adminHref}
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/12 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20"
                  >
                    Admin
                  </Link>
                ) : null}
                <Link
                  href="/auth/logout"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Log out
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <AccentMetric
                label="Completed this week"
                value={`${access.completedThisWeek}`}
                tone="cyan"
              />
              <AccentMetric
                label="Current streak"
                value={`${completionInsights.streakCount} day${completionInsights.streakCount === 1 ? "" : "s"}`}
                tone="amber"
              />
              <AccentMetric
                label="Consistency badge"
                value={completionInsights.currentConsistencyBadge}
                tone="stone"
              />
            </div>

            {legal.required ? (
              <div className="mt-4 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
                First-time members must accept the Ravqen waiver and terms once before the first workout can begin.
              </div>
            ) : null}
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(9,27,31,0.96)_0%,rgba(5,12,16,0.98)_100%)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.08),transparent_28%)]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Today&apos;s workout</p>
                  <h1 className="mt-3 text-3xl font-semibold text-white">{workout.category}</h1>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-stone-300">{workout.focus}</p>
                </div>
                <div className="rounded-[1.4rem] border border-amber-300/15 bg-amber-300/10 px-3 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-amber-100">Program day</p>
                  <p className="mt-2 text-base font-semibold text-white">{workout.dayLabel}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <DashboardStat label="Session" value={`${workout.estimatedDurationMin} min`} />
                <DashboardStat label="Readiness" value={completionInsights.readiness.status} />
                <DashboardStat label="Next focus" value={completionInsights.readiness.nextFocus.split(" ").slice(0, 2).join(" ")} />
              </div>

              <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100">Why today matters</p>
                <p className="mt-2 text-sm leading-6 text-stone-200">{whyTodaySummary}</p>
              </div>

              <div className="mt-5 hidden gap-2 sm:flex">
                <Link
                  href={access.allowed ? primaryWorkoutHref : "#"}
                  aria-disabled={!access.allowed}
                  className={`flex-1 rounded-full px-5 py-3 text-center text-sm font-semibold shadow-[0_12px_30px_rgba(103,232,249,0.22)] ${
                    access.allowed
                      ? "bg-cyan-300 text-slate-950"
                      : "pointer-events-none bg-white/10 text-stone-400"
                  }`}
                >
                  Start today&apos;s workout
                </Link>
                <Link
                  href={historyHref}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
                >
                  History
                </Link>
              </div>

              {!access.allowed && access.message ? (
                <div className="mt-4 rounded-[1.3rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
                  {access.message}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <QuickSnapshot
                  title="Recent"
                  heading={completionInsights.lastCompletedWorkout?.workoutLabel ?? "No completed workout yet"}
                  subheading={
                    completionInsights.lastCompletedWorkout
                      ? formatSessionDate(completionInsights.lastCompletedWorkout.scheduledFor)
                      : "Save your first session to build your history."
                  }
                  body={
                    completionInsights.lastCompletedWorkout
                      ? completionInsights.lastCompletedWorkout.loadSummary ??
                        completionInsights.lastCompletedWorkout.notes ??
                        `RPE ${completionInsights.lastCompletedWorkout.rpe ?? "-"}`
                      : "Your latest session snapshot will appear here."
                  }
                />
                <QuickSnapshot
                  title="Next"
                  heading={`${completionInsights.tomorrowWorkout.dayLabel}: ${completionInsights.tomorrowWorkout.category}`}
                  subheading={`Opens at ${completionInsights.tomorrowWorkout.availableAt}`}
                  body={completionInsights.readiness.nextFocus}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4">
            <Panel title="Readiness and membership">
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryTile
                  title="Today"
                  lines={[
                    `Status: ${completionInsights.readiness.status}`,
                    access.allowed
                      ? completionInsights.readiness.summary
                      : access.message ?? "Session access is currently paused.",
                  ]}
                />
                <SummaryTile
                  title="Upcoming"
                  lines={[
                    `${completionInsights.tomorrowWorkout.dayLabel}: ${completionInsights.tomorrowWorkout.category}`,
                    `Opens at ${completionInsights.tomorrowWorkout.availableAt}`,
                    completionInsights.readiness.nextFocus,
                  ]}
                />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SummaryTile
                  title="Usage"
                  lines={[
                    `Plan: ${activeMember.tierLabel}`,
                    `Sessions left: ${currentSessionsLeftLabel}`,
                    completionInsights.weeklyLimit
                      ? `Weekly sessions used: ${completionInsights.currentWeeklyUsed}/${completionInsights.weeklyLimit}`
                      : `Weekly sessions used: ${completionInsights.currentWeeklyUsed}`,
                  ]}
                />
                <SummaryTile
                  title="Momentum"
                  lines={[
                    `Completed this week: ${access.completedThisWeek}`,
                    `Current streak: ${completionInsights.streakCount} day${completionInsights.streakCount === 1 ? "" : "s"}`,
                    `Status: ${activeMember.status}`,
                  ]}
                />
              </div>
            </Panel>

            {legal.required ? (
              <Panel title="Account and support">
                <SummaryTile
                  title="Required before first workout"
                  lines={[
                    `Waiver accepted: ${legal.waiverAccepted ? "Yes" : "No"}`,
                    `Terms accepted: ${legal.termsAccepted ? "Yes" : "No"}`,
                    "Complete both once to unlock workout start.",
                  ]}
                />
                <div className="mt-3">
                  <Link
                    href={legalHref}
                    className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/12 px-4 py-2 text-sm font-semibold text-cyan-50"
                  >
                    Sign waiver and terms
                  </Link>
                </div>
              </Panel>
            ) : null}

            <Panel title="Weekly summary">
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryTile title="This week" lines={weeklySummaryLines} />
                <SummaryTile
                  title="Movement progress"
                  lines={
                    completionInsights.personalBests.movementBests.length
                      ? completionInsights.personalBests.movementBests
                          .slice(0, 3)
                          .map((item) => `${item.movement}: ${item.loadLabel}`)
                      : ["No per-exercise PBs yet.", "Log load on each movement to unlock this view."]
                  }
                />
              </div>
            </Panel>

            <Panel title="Personal bests">
              <div className="space-y-3">
                <MetricRow
                  label="Heaviest logged load"
                  value={completionInsights.personalBests.heaviestLoadLabel ?? "No load logged yet"}
                />
                <MetricRow
                  label="Highest recent RPE"
                  value={
                    completionInsights.personalBests.highestRpe !== null
                      ? `${completionInsights.personalBests.highestRpe}/10`
                      : "No RPE logged yet"
                  }
                />
                <MetricRow
                  label="Sessions this week"
                  value={`${access.completedThisWeek}`}
                />
              </div>
              {completionInsights.personalBests.movementBests.length ? (
                <div className="mt-4 space-y-2">
                  {completionInsights.personalBests.movementBests.slice(0, 3).map((item) => (
                    <div
                      key={`${item.movement}-${item.loadLabel}`}
                      className="rounded-[1rem] border border-white/8 bg-black/20 px-3 py-3"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Movement best</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-sm text-white">{item.movement}</p>
                        <p className="text-sm font-semibold text-cyan-100">{item.loadLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Panel>

            <Panel title="Account and support">
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryTile
                  title="Account"
                  lines={[
                    `Email: ${activeMember.email}`,
                    `Plan: ${activeMember.tierLabel}`,
                    `Status: ${activeMember.status}`,
                  ]}
                />
                <SummaryTile
                  title="Help"
                  lines={[
                    "Use History to review past sessions and progress.",
                    "Use Forgot password on the login page if you lose access.",
                    "Contact your gym admin for membership or program access issues.",
                  ]}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/support"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Support
                </Link>
                <Link
                  href="/plans"
                  className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/15"
                >
                  View plans
                </Link>
              </div>
            </Panel>
          </div>

          <Panel title="Progress">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-sm text-stone-300">
                Recent effort, tracked exercises, and movement trends from your latest saved sessions.
              </p>
              <Link href={historyHref} className="text-sm font-semibold text-cyan-100">
                View all
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Recent chart</p>
                <div className="mt-4 space-y-3">
                  {completionInsights.progressChart.map((item, index) => (
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
                          style={{ width: rpeBarWidth(item.rpe) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Latest session</p>
                {latestRecentWorkout ? (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-white">{latestRecentWorkout.workoutLabel}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {formatSessionDate(latestRecentWorkout.scheduledFor)}
                    </p>
                    <p className="mt-3 text-sm text-stone-200">
                      {latestRecentWorkout.exerciseEntries.filter((entry) => entry.achievedValue || entry.loadValue).length} exercises tracked
                    </p>
                    <p className="mt-2 text-sm text-stone-300">
                      {latestRecentWorkout.loadSummary ?? latestRecentWorkout.notes ?? "No detailed note saved yet."}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-stone-300">
                    No completed workouts yet. Your latest saved session will show up here.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SummaryTile
                title="Performance summary"
                lines={[
                  `Tracked movements: ${completionInsights.recentPerformanceSummary.trackedMovements}`,
                  `Logged outputs: ${completionInsights.recentPerformanceSummary.loggedOutputs}`,
                  `Top improver: ${completionInsights.recentPerformanceSummary.topImprovingMovement ?? "Not enough data yet"}`,
                ]}
              />

              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Movement trends</p>
                <div className="mt-3 space-y-3">
                  {completionInsights.movementTrends.length ? (
                    completionInsights.movementTrends.map((trend) => (
                      <div key={trend.movement}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-white">{trend.movement}</p>
                          <p className="text-xs text-cyan-100">
                            {trend.points.at(-1)?.load ?? 0} kg latest
                          </p>
                        </div>
                        <div className="mt-2 flex gap-2">
                          {trend.points.map((point, index) => (
                            <div key={`${trend.movement}-${point.label}-${index}`} className="flex-1">
                              <div
                                className="h-2 rounded-full bg-[linear-gradient(90deg,#67e8f9_0%,#22d3ee_60%,#f59e0b_100%)]"
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
                    <p className="text-sm text-stone-300">Movement trends will appear after a few logged sessions.</p>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Streak history</p>
          <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
            {completionInsights.streakHistory.map((entry) => (
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

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#020507]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
          <div className="mx-auto grid w-full max-w-md grid-cols-[1fr_auto] gap-2">
            <Link
              href={access.allowed ? "/player/workout" : "#"}
              aria-disabled={!access.allowed}
              className={`rounded-full px-5 py-4 text-center text-base font-semibold ${
                access.allowed
                  ? "bg-cyan-300 text-slate-950 shadow-[0_12px_30px_rgba(103,232,249,0.22)]"
                  : "pointer-events-none bg-white/10 text-stone-400"
              }`}
            >
              Start workout
            </Link>
            <Link
              href="/player/history"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white"
            >
              History
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-black/20 px-3 py-3 text-center">
      <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white sm:text-base">{value}</p>
    </div>
  );
}

function AccentMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "amber" | "stone";
}) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-50",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-50",
    stone: "border-white/10 bg-black/20 text-white",
  } as const;

  return (
    <div className={`rounded-[1.2rem] border px-4 py-3 ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-300">{label}</p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}

function QuickSnapshot({
  title,
  heading,
  subheading,
  body,
}: {
  title: string;
  heading: string;
  subheading: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{title}</p>
      <p className="mt-2 text-sm font-semibold text-white">{heading}</p>
      <p className="mt-1 text-xs text-stone-400">{subheading}</p>
      <p className="mt-3 text-sm text-stone-300">{body}</p>
    </div>
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

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryTile({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">{title}</p>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-6 text-stone-100">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
