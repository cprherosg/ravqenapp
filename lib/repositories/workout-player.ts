import type { MemberProfile } from "@/lib/admin-data";
import { isSuperAdminEmail } from "@/lib/auth/admin-constants";
import { getCurrentSingaporeDayLabel } from "@/lib/data";
import { RAVQEN_TERMS_VERSION, RAVQEN_WAIVER_VERSION } from "@/lib/legal";
import type { DailyWorkout, ExercisePerformanceEntry } from "@/lib/types";
import { getAdminMembers } from "@/lib/repositories/admin-members";
import {
  getPersistedWorkoutForDate,
  getPersistedWorkoutForProgram,
} from "@/lib/repositories/programming";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  adaptWorkoutForMember,
  getProgrammingEngineSnapshot,
} from "@/lib/training-engine";
import {
  extractMovementPersonalBestsFromEntries,
  entriesToPerformanceRows,
  performanceRowsToEntries,
  parseFeedbackNotes,
} from "@/lib/workout-performance";

export type PlayerBootstrap = {
  workout: DailyWorkout;
  activeMember: MemberProfile;
  isAdmin: boolean;
  members: MemberProfile[];
  sessionId: string | null;
  legal: {
    required: boolean;
    waiverAccepted: boolean;
    termsAccepted: boolean;
    waiverVersion: string;
    termsVersion: string;
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

function todayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function startOfSingaporeWeek(date = new Date()) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const current = new Date(`${dateKey}T00:00:00+08:00`);
  const weekday = current.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  current.setDate(current.getDate() + mondayOffset);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(current);
}

function endOfSingaporeWeek(date = new Date()) {
  const mondayKey = startOfSingaporeWeek(date);
  const monday = new Date(`${mondayKey}T00:00:00+08:00`);
  monday.setDate(monday.getDate() + 6);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(monday);
}

function nextSingaporeDate(date = new Date()) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const current = new Date(`${dateKey}T00:00:00+08:00`);
  current.setDate(current.getDate() + 1);
  return current;
}

function startOfSingaporeToday(date = new Date()) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return new Date(`${dateKey}T00:00:00+08:00`);
}

function workoutLabelFromSlug(slug: string) {
  return slug
    .replace(/-\d+$/, "")
    .split("-")
    .slice(0, -2)
    .join(" ")
    .replace(/\b\w/g, (match: string) => match.toUpperCase());
}

function computeStreakCount(dates: string[]) {
  if (!dates.length) {
    return 0;
  }

  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  const cursor = startOfSingaporeToday();
  let streak = 0;

  for (const date of uniqueDates) {
    const cursorKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(cursor);

    if (date !== cursorKey) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function consistencyBadgeFor(weeklyUsed: number, streakCount: number) {
  if (streakCount >= 3) {
    return "Streak builder";
  }

  if (weeklyUsed >= 4) {
    return "Locked in";
  }

  if (weeklyUsed >= 2) {
    return "Building momentum";
  }

  return "First strike";
}

function usesSessionCredits(tierType: MemberProfile["tierType"]) {
  return tierType === "single_session_pack" || tierType === "complimentary";
}

function buildStreakHistory(completedDates: string[], days = 7) {
  const dateSet = new Set(completedDates);
  const current = startOfSingaporeToday();

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(current);
    day.setDate(current.getDate() - (days - index - 1));
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(day);
    const label = new Intl.DateTimeFormat("en-SG", {
      timeZone: "Asia/Singapore",
      weekday: "short",
    }).format(day);

    return {
      date,
      label,
      completed: dateSet.has(date),
    };
  });
}

function extractHeaviestLoadLabel(loadSummaries: Array<string | null>) {
  const candidates = loadSummaries
    .flatMap((summary) => {
      if (!summary) return [];
      return Array.from(summary.matchAll(/(\d+(?:\.\d+)?)\s*kg/gi)).map((match) => ({
        value: Number(match[1]),
        label: `${match[1]} kg`,
      }));
    })
    .sort((a, b) => b.value - a.value);

  return candidates[0]?.label ?? null;
}

function buildProgressChart(
  feedback: Array<{
    scheduledFor: string;
    rpe: number | null;
    exerciseEntries: ExercisePerformanceEntry[];
  }>,
) {
  return feedback.slice(0, 6).map((item) => ({
    label: formatShortDate(item.scheduledFor),
    rpe: item.rpe,
    trackedExercises: item.exerciseEntries.filter(
      (entry) => entry.achievedValue || entry.loadValue,
    ).length,
  }));
}

function parseLoadNumber(value: string | null | undefined) {
  const match = value?.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function buildMovementTrends(entries: ExercisePerformanceEntry[]) {
  const grouped = new Map<string, Array<{ label: string; load: number }>>();

  for (const entry of entries) {
    const load = parseLoadNumber(entry.loadValue);
    if (!entry.exerciseName || load === null) {
      continue;
    }

    const current = grouped.get(entry.exerciseName) ?? [];
    current.push({
      label: entry.phase,
      load,
    });
    grouped.set(entry.exerciseName, current);
  }

  return Array.from(grouped.entries())
    .map(([movement, points]) => ({
      movement,
      points: points.slice(-4),
    }))
    .filter((item) => item.points.length > 0)
    .sort((a, b) => (b.points.at(-1)?.load ?? 0) - (a.points.at(-1)?.load ?? 0))
    .slice(0, 3);
}

function buildRecentPerformanceSummary(entries: ExercisePerformanceEntry[]) {
  const trackedMovements = new Set(entries.map((entry) => entry.exerciseName).filter(Boolean)).size;
  const loggedOutputs = entries.filter((entry) => entry.achievedValue || entry.loadValue).length;
  const movementTrends = buildMovementTrends(entries);
  const topImprovingMovement =
    movementTrends
      .map((trend) => ({
        movement: trend.movement,
        delta:
          trend.points.length >= 2
            ? trend.points.at(-1)!.load - trend.points[0]!.load
            : 0,
      }))
      .sort((a, b) => b.delta - a.delta)[0]?.movement ?? null;

  return {
    trackedMovements,
    loggedOutputs,
    topImprovingMovement,
  };
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function buildReadinessState(input: {
  accessAllowed: boolean;
  completedThisWeek: number;
  streakCount: number;
  recentRpeValues: number[];
  tomorrowCategory: string;
}) {
  if (!input.accessAllowed) {
    return {
      status: "Paused",
      summary: "Access is currently paused until membership limits or status are updated.",
      nextFocus: `Next available workout: ${input.tomorrowCategory}`,
    };
  }

  const averageRpe =
    input.recentRpeValues.length > 0
      ? input.recentRpeValues.reduce((sum, value) => sum + value, 0) /
        input.recentRpeValues.length
      : null;

  if (averageRpe !== null && averageRpe >= 8.5) {
    return {
      status: "Recover smart",
      summary: "Recent effort has been high. Keep technique clean and respect rest windows.",
      nextFocus: `Tomorrow leans into ${input.tomorrowCategory}.`,
    };
  }

  if (input.completedThisWeek >= 4 || input.streakCount >= 3) {
    return {
      status: "Building momentum",
      summary: "You are stacking consistent sessions. Stay smooth and keep the rotation moving.",
      nextFocus: `Next up: ${input.tomorrowCategory}.`,
    };
  }

  return {
    status: "Ready to push",
    summary: "Training load is in a good spot for another quality session.",
    nextFocus: `Tomorrow opens with ${input.tomorrowCategory}.`,
  };
}

async function backfillExercisePerformanceForUser(supabase: ReturnType<typeof createAdminSupabaseClient>, userId: string) {
  try {
    const { data: completedSessions } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("scheduled_for", { ascending: false })
      .limit(200);

    const sessionIds = (completedSessions ?? []).map((session) => session.id);
    if (!sessionIds.length) {
      return;
    }

    const [{ data: feedbackRows }, { data: performanceRows }] = await Promise.all([
      supabase
        .from("session_feedback")
        .select("session_id,notes")
        .in("session_id", sessionIds),
      supabase
        .from("exercise_performance")
        .select("session_id")
        .in("session_id", sessionIds),
    ]);

    const existingSessionIds = new Set((performanceRows ?? []).map((row) => row.session_id));
    const rowsToInsert = (feedbackRows ?? [])
      .filter((row) => !existingSessionIds.has(row.session_id))
      .flatMap((row) => {
        const parsed = parseFeedbackNotes(row.notes);
        return parsed.exerciseEntries.length
          ? entriesToPerformanceRows(row.session_id, parsed.exerciseEntries)
          : [];
      });

    if (rowsToInsert.length) {
      await supabase.from("exercise_performance").insert(rowsToInsert);
    }
  } catch {
    // Keep the app usable even if legacy migration cannot complete yet.
  }
}

export async function getPlayerBootstrap(
  memberId: string,
): Promise<PlayerBootstrap> {
  const members = await getAdminMembers();
  const activeMember = members.find((member) => member.id === memberId);

  if (!activeMember) {
    throw new Error("No member profile found for the authenticated user.");
  }

  const dayLabel = getCurrentSingaporeDayLabel();
  const tomorrowDayLabel = getCurrentSingaporeDayLabel(nextSingaporeDate());
  const isAdmin = isSuperAdminEmail(activeMember.email);
  const baseWorkout =
    activeMember.tierType === "complimentary"
      ? await getPersistedWorkoutForProgram("complimentary", dayLabel)
      : await getPersistedWorkoutForDate();

  try {
    const supabase = createAdminSupabaseClient();
    const tomorrowWorkout =
      activeMember.tierType === "complimentary"
        ? await getPersistedWorkoutForProgram("complimentary", tomorrowDayLabel)
        : await getPersistedWorkoutForDate(nextSingaporeDate());
    await backfillExercisePerformanceForUser(supabase, activeMember.id);

    await supabase.from("workout_templates").upsert(
      {
        slug: baseWorkout.slug,
        title: `${baseWorkout.category} ${baseWorkout.dayLabel}`,
        category: baseWorkout.category,
        focus: baseWorkout.focus,
        estimated_duration_min: baseWorkout.estimatedDurationMin,
        is_active: true,
        structure: baseWorkout,
      },
      { onConflict: "slug" },
    );

    const { data: existingSessionRows } = await supabase
      .from("workout_sessions")
      .select("id,status")
      .eq("user_id", activeMember.id)
      .eq("workout_slug", baseWorkout.slug)
      .eq("scheduled_for", todayDate())
      .in("status", ["scheduled", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1);
    const existingSession = existingSessionRows?.[0] ?? null;

    const { count: completedThisWeek } = await supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", activeMember.id)
      .eq("status", "completed")
      .gte("scheduled_for", startOfSingaporeWeek())
      .lte("scheduled_for", endOfSingaporeWeek());

    const { data: legalRows } = await supabase
      .from("member_legal_acceptances")
      .select("document_type,document_version")
      .eq("user_id", activeMember.id);

    const waiverAccepted = (legalRows ?? []).some(
      (row) =>
        row.document_type === "waiver" &&
        row.document_version === RAVQEN_WAIVER_VERSION,
    );
    const termsAccepted = (legalRows ?? []).some(
      (row) =>
        row.document_type === "terms" &&
        row.document_version === RAVQEN_TERMS_VERSION,
    );
    const legal = {
      required: !(waiverAccepted && termsAccepted),
      waiverAccepted,
      termsAccepted,
      waiverVersion: RAVQEN_WAIVER_VERSION,
      termsVersion: RAVQEN_TERMS_VERSION,
    };

    const { data: recentSessions } = await supabase
      .from("workout_sessions")
      .select("id,scheduled_for,workout_slug,status")
      .eq("user_id", activeMember.id)
      .eq("status", "completed")
      .order("scheduled_for", { ascending: false })
      .limit(8);

    const recentSessionIds = (recentSessions ?? []).map((session) => session.id);
    const { data: feedbackRows } = recentSessionIds.length
      ? await supabase
          .from("session_feedback")
          .select("session_id,rpe,load_summary,notes")
          .in("session_id", recentSessionIds)
      : { data: [] as Array<{ session_id: string; rpe: number | null; load_summary: string | null; notes: string | null }> };

    const feedbackBySession = new Map(
      (feedbackRows ?? []).map((row) => [row.session_id, row]),
    );
    let performanceBySession = new Map<string, ExercisePerformanceEntry[]>();
    if (recentSessionIds.length) {
      try {
        const { data: performanceRows } = await supabase
          .from("exercise_performance")
          .select(
            "session_id,exercise_key,exercise_name,serial,phase,round_label,equipment,target_label,target_unit,achieved_value,load_value,notes,created_at,id",
          )
          .in("session_id", recentSessionIds)
          .order("serial", { ascending: true });

        performanceBySession = new Map<string, ExercisePerformanceEntry[]>();
        for (const sessionId of recentSessionIds) {
          performanceBySession.set(
            sessionId,
            performanceRowsToEntries(
              (performanceRows ?? []).filter((row) => row.session_id === sessionId),
            ),
          );
        }
      } catch {
        performanceBySession = new Map();
      }
    }
    const recentFeedback = (recentSessions ?? []).map((session) => {
      const feedback = feedbackBySession.get(session.id);
      const parsedNotes = parseFeedbackNotes(feedback?.notes);
      const performanceEntries =
        performanceBySession.get(session.id) ?? parsedNotes.exerciseEntries;

      if (!performanceBySession.get(session.id)?.length && parsedNotes.exerciseEntries.length) {
        void (async () => {
          try {
            await supabase
              .from("exercise_performance")
              .insert(
                parsedNotes.exerciseEntries.map((entry) => ({
                  session_id: session.id,
                  exercise_key: entry.exerciseKey,
                  exercise_name: entry.exerciseName,
                  serial: entry.serial,
                  phase: entry.phase,
                  round_label: entry.roundLabel,
                  equipment: entry.equipment,
                  target_label: entry.targetLabel,
                  target_unit: entry.targetUnit || null,
                  achieved_value: entry.achievedValue,
                  load_value: entry.loadValue,
                  notes: entry.notes,
                })),
              );
          } catch {
            // Ignore per-session backfill failures during page render.
          }
        })();
      }

      return {
        sessionId: session.id,
        scheduledFor: session.scheduled_for,
        workoutLabel: workoutLabelFromSlug(session.workout_slug),
        rpe: feedback?.rpe ?? null,
        loadSummary: feedback?.load_summary ?? null,
        notes: parsedNotes.memberNotes,
        exerciseEntries: performanceEntries,
      };
    });
    const recentRpeValues = recentFeedback
      .map((item) => item.rpe)
      .filter((value): value is number => value !== null);
    const recentExerciseEntries = recentFeedback.flatMap((item) => item.exerciseEntries);
    const movementTrends = buildMovementTrends(recentExerciseEntries);
    const recentPerformanceSummary = buildRecentPerformanceSummary(recentExerciseEntries);
    const workout = adaptWorkoutForMember({
      workout: baseWorkout,
      member: activeMember,
      recentRpeValues,
      recentExerciseEntries,
    });
    const streakHistory = buildStreakHistory(
      (recentSessions ?? []).map((session) => session.scheduled_for),
    );
    const streakCount = computeStreakCount(
      (recentSessions ?? []).map((session) => session.scheduled_for),
    );
    const personalBests = {
      heaviestLoadLabel: extractHeaviestLoadLabel(
        recentFeedback.map((item) => item.loadSummary),
      ),
      highestRpe:
        recentFeedback
          .map((item) => item.rpe)
          .filter((value): value is number => value !== null)
          .sort((a, b) => b - a)[0] ?? null,
      movementBests: extractMovementPersonalBestsFromEntries(recentExerciseEntries),
    };
    const lastCompletedWorkout = recentFeedback[0] ?? null;
    const engineSnapshot = getProgrammingEngineSnapshot();

    const categoryAllowed =
      (activeMember.tierType === "complimentary" && workout.programId === "complimentary") ||
      activeMember.allowedCategories.includes(workout.category);
    const hasSessionPackCredit =
      !usesSessionCredits(activeMember.tierType) || activeMember.sessionsRemaining > 0;
    const withinWeeklyLimit =
      activeMember.tierType !== "weekly_limit" ||
      activeMember.weeklyLimit === null ||
      (completedThisWeek ?? 0) < activeMember.weeklyLimit;
    const statusAllowed = activeMember.status === "active";
    let accessMessage: string | null = null;
    if (!statusAllowed) {
      accessMessage = "This membership is not active right now. Update the member status to unlock workouts.";
    } else if (!categoryAllowed) {
      accessMessage = `${workout.category} is not enabled for this member's access tier.`;
    } else if (!hasSessionPackCredit) {
      accessMessage = "This member has no session credits remaining.";
    } else if (!withinWeeklyLimit) {
      accessMessage = `This member has already used their ${activeMember.weeklyLimit} weekly sessions.`;
    }
    const readiness = buildReadinessState({
      accessAllowed: accessMessage === null,
      completedThisWeek: completedThisWeek ?? 0,
      streakCount,
      recentRpeValues,
      tomorrowCategory: tomorrowWorkout.category,
    });

    if (existingSession?.id) {
      return {
        workout,
        activeMember,
        isAdmin,
        members,
        sessionId: existingSession.id,
        legal,
        access: {
          allowed: accessMessage === null,
          message: accessMessage,
          completedThisWeek: completedThisWeek ?? 0,
        },
        completionInsights: {
          currentSessionsLeft: activeMember.sessionsRemaining,
          currentWeeklyUsed: completedThisWeek ?? 0,
          currentConsistencyBadge: consistencyBadgeFor(completedThisWeek ?? 0, streakCount),
          projectedSessionsLeft: usesSessionCredits(activeMember.tierType)
            ? Math.max(activeMember.sessionsRemaining - 1, 0)
            : activeMember.sessionsRemaining,
          projectedWeeklyUsed: Math.min((completedThisWeek ?? 0) + 1, 7),
          weeklyLimit: activeMember.weeklyLimit,
          streakCount,
          consistencyBadge: consistencyBadgeFor((completedThisWeek ?? 0) + 1, streakCount),
          recentFeedback,
          streakHistory,
          personalBests,
          progressChart: buildProgressChart(recentFeedback),
          movementTrends,
          recentPerformanceSummary,
          readiness,
          lastCompletedWorkout,
          tomorrowWorkout: {
            dayLabel: tomorrowWorkout.dayLabel,
            category: tomorrowWorkout.category,
            availableAt: engineSnapshot.phaseLabel === "Deload" ? "12:00 AM" : "12:00 AM",
          },
        },
      };
    }

    if (accessMessage) {
      return {
        workout,
        activeMember,
        isAdmin,
        members,
        sessionId: null,
        legal,
        access: {
          allowed: false,
          message: accessMessage,
          completedThisWeek: completedThisWeek ?? 0,
        },
        completionInsights: {
          currentSessionsLeft: activeMember.sessionsRemaining,
          currentWeeklyUsed: completedThisWeek ?? 0,
          currentConsistencyBadge: consistencyBadgeFor(completedThisWeek ?? 0, streakCount),
          projectedSessionsLeft: activeMember.sessionsRemaining,
          projectedWeeklyUsed: completedThisWeek ?? 0,
          weeklyLimit: activeMember.weeklyLimit,
          streakCount,
          consistencyBadge: consistencyBadgeFor(completedThisWeek ?? 0, streakCount),
          recentFeedback,
          streakHistory,
          personalBests,
          progressChart: buildProgressChart(recentFeedback),
          movementTrends,
          recentPerformanceSummary,
          readiness,
          lastCompletedWorkout,
          tomorrowWorkout: {
            dayLabel: tomorrowWorkout.dayLabel,
            category: tomorrowWorkout.category,
            availableAt: "12:00 AM",
          },
        },
      };
    }

    if (legal.required) {
      return {
        workout,
        activeMember,
        isAdmin,
        members,
        sessionId: null,
        legal,
        access: {
          allowed: true,
          message: null,
          completedThisWeek: completedThisWeek ?? 0,
        },
        completionInsights: {
          currentSessionsLeft: activeMember.sessionsRemaining,
          currentWeeklyUsed: completedThisWeek ?? 0,
          currentConsistencyBadge: consistencyBadgeFor(completedThisWeek ?? 0, streakCount),
          projectedSessionsLeft: usesSessionCredits(activeMember.tierType)
            ? Math.max(activeMember.sessionsRemaining - 1, 0)
            : activeMember.sessionsRemaining,
          projectedWeeklyUsed: Math.min((completedThisWeek ?? 0) + 1, 7),
          weeklyLimit: activeMember.weeklyLimit,
          streakCount,
          consistencyBadge: consistencyBadgeFor((completedThisWeek ?? 0) + 1, streakCount),
          recentFeedback,
          streakHistory,
          personalBests,
          progressChart: buildProgressChart(recentFeedback),
          movementTrends,
          recentPerformanceSummary,
          readiness,
          lastCompletedWorkout,
          tomorrowWorkout: {
            dayLabel: tomorrowWorkout.dayLabel,
            category: tomorrowWorkout.category,
            availableAt: "12:00 AM",
          },
        },
      };
    }

    const { data: insertedSession, error: insertError } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: activeMember.id,
        workout_slug: baseWorkout.slug,
        scheduled_for: todayDate(),
        status: "scheduled",
        intensity_selected: "base",
        replay_count: 0,
        feedback_submitted: false,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

      return {
        workout,
        activeMember,
        isAdmin,
        members,
        sessionId: insertedSession.id,
        legal,
        access: {
          allowed: true,
          message: null,
          completedThisWeek: completedThisWeek ?? 0,
        },
        completionInsights: {
          currentSessionsLeft: activeMember.sessionsRemaining,
          currentWeeklyUsed: completedThisWeek ?? 0,
          currentConsistencyBadge: consistencyBadgeFor(completedThisWeek ?? 0, streakCount),
          projectedSessionsLeft: usesSessionCredits(activeMember.tierType)
            ? Math.max(activeMember.sessionsRemaining - 1, 0)
            : activeMember.sessionsRemaining,
          projectedWeeklyUsed: Math.min((completedThisWeek ?? 0) + 1, 7),
          weeklyLimit: activeMember.weeklyLimit,
          streakCount,
          consistencyBadge: consistencyBadgeFor((completedThisWeek ?? 0) + 1, streakCount),
          recentFeedback,
          streakHistory,
          personalBests,
          progressChart: buildProgressChart(recentFeedback),
          movementTrends,
          recentPerformanceSummary,
          readiness,
          lastCompletedWorkout,
          tomorrowWorkout: {
            dayLabel: tomorrowWorkout.dayLabel,
            category: tomorrowWorkout.category,
            availableAt: "12:00 AM",
          },
        },
      };
  } catch {
    return {
      workout: baseWorkout,
      activeMember,
      isAdmin,
      members,
      sessionId: null,
      legal: {
        required: true,
        waiverAccepted: false,
        termsAccepted: false,
        waiverVersion: RAVQEN_WAIVER_VERSION,
        termsVersion: RAVQEN_TERMS_VERSION,
      },
      access: {
        allowed: true,
        message: null,
        completedThisWeek: 0,
      },
      completionInsights: {
        currentSessionsLeft: activeMember.sessionsRemaining,
        currentWeeklyUsed: 0,
        currentConsistencyBadge: "First strike",
        projectedSessionsLeft: activeMember.sessionsRemaining,
        projectedWeeklyUsed: 1,
        weeklyLimit: activeMember.weeklyLimit,
        streakCount: 0,
        consistencyBadge: "First strike",
        recentFeedback: [],
        streakHistory: buildStreakHistory([]),
        personalBests: {
          heaviestLoadLabel: null,
          highestRpe: null,
          movementBests: [],
        },
        progressChart: [],
        movementTrends: [],
        recentPerformanceSummary: {
          trackedMovements: 0,
          loggedOutputs: 0,
          topImprovingMovement: null,
        },
        readiness: {
          status: "Ready to push",
          summary: "Training load is in a good spot for another quality session.",
          nextFocus: "Tomorrow opens at 12:00 AM.",
        },
        lastCompletedWorkout: null,
        tomorrowWorkout: {
          dayLabel: "Tomorrow",
          category: "Next workout",
          availableAt: "12:00 AM",
        },
      },
    };
  }
}
