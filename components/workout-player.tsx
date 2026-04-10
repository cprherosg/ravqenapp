"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  markWorkoutInProgressAction,
  saveWorkoutCompletionAction,
  stopWorkoutEarlyAction,
} from "@/app/player/actions";
import type { MemberProfile } from "@/lib/admin-data";
import { DemoMedia } from "@/components/demo-media";
import type {
  DailyWorkout,
  ExercisePerformanceEntry,
  IntensityLevel,
  WorkoutExercise,
  WorkoutPhase,
} from "@/lib/types";

type WorkoutPlayerProps = {
  workout: DailyWorkout;
  activeMember: MemberProfile;
  members: MemberProfile[];
  sessionId: string | null;
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

const transitionMedia: WorkoutExercise = {
  name: "Transition / Rest",
  durationSec: 15,
  restSec: 0,
  equipment: "Move to next station",
  demoSummary:
    "Use this window to change station, adjust weights, and prepare for the next movement.",
  mediaSrc: "/exercise-media/transition-rest.svg",
  mediaAlt: "Transition and rest screen",
  targets: {
    low: "reset",
    base: "reset",
    high: "reset",
  },
  cues: [],
};

function formatClock(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(normalizedSeconds / 60);
  const seconds = normalizedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function createTransitionPhase(
  baseId: string,
  seconds: number,
  blockTitle: string,
  roundLabel: string,
): WorkoutPhase {
  return {
    id: `${baseId}-transition`,
    phaseType: "transition",
    phase: "Transition",
    blockTitle,
    roundLabel,
    exercise: {
      ...transitionMedia,
      durationSec: seconds,
    },
  };
}

function extractCycle(roundLabel: string) {
  const match = roundLabel.match(/(\d+\/\d+)/);
  return match?.[1] ?? roundLabel;
}

function isPositiveNumeric(value: string) {
  return /^\d+(\.\d+)?$/.test(value) && Number(value) > 0;
}

function serialKey(phase: WorkoutPhase) {
  return `${phase.phase}|${phase.exercise.name}`;
}

const TIMER_RADIUS = 82;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

function playCountdownBeep(audioContext: AudioContext, secondsRemaining: number) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const accent = secondsRemaining === 1;

  oscillator.type = accent ? "triangle" : "sine";
  oscillator.frequency.value = accent ? 1180 : 920 + secondsRemaining * 40;
  gainNode.gain.value = accent ? 0.16 : 0.1;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + (accent ? 0.2 : 0.14));

  oscillator.start(now);
  oscillator.stop(now + (accent ? 0.2 : 0.14));
}

function playPhaseStartBoom(audioContext: AudioContext, phaseType: WorkoutPhase["phaseType"]) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = phaseType === "transition" ? "square" : "triangle";
  oscillator.frequency.setValueAtTime(220, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    phaseType === "transition" ? 120 : 140,
    now + 0.22,
  );

  gainNode.gain.setValueAtTime(0.18, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

export function WorkoutPlayer({
  workout,
  activeMember,
  sessionId,
  legal,
  access,
  completionInsights,
}: WorkoutPlayerProps) {
  const router = useRouter();
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastCountdownCueRef = useRef<string | null>(null);
  const sessionIntensity: IntensityLevel = "base";
  const phases = useMemo<WorkoutPhase[]>(() => {
    const built: WorkoutPhase[] = [];

    workout.warmup.forEach((exercise, index) => {
      built.push({
        id: `warmup-${index}`,
        phaseType: "work",
        phase: "Warm-up",
        blockTitle: "Warm-up",
        roundLabel: `Cycle ${index + 1}/${workout.warmup.length}`,
        exercise,
      });
    });

    built.push(
      createTransitionPhase(
        "warmup-finish",
        30,
        "Set up for main workout",
        "Warm-up complete",
      ),
    );

    workout.blocks.forEach((block) => {
      block.exercises.forEach((exercise, exerciseIndex) => {
        const cycleCount = exercise.cycles ?? block.rounds;

        Array.from({ length: cycleCount }, (_, roundIndex) => {
          const isLastExercise = exerciseIndex === block.exercises.length - 1;
          const isLastRound = roundIndex === cycleCount - 1;

          built.push({
            id: `${block.title}-${exerciseIndex}-${roundIndex}`,
            phaseType: "work",
            phase: block.title,
            blockTitle: block.format,
            roundLabel: `Cycle ${roundIndex + 1}/${cycleCount}`,
            exercise,
          });

          if (!(isLastExercise && isLastRound) && exercise.restSec > 0) {
            built.push(
              createTransitionPhase(
                `${block.title}-${exerciseIndex}-${roundIndex}`,
                exercise.restSec,
                block.format,
                `Cycle ${roundIndex + 1}/${cycleCount}`,
              ),
            );
          }
        });
      });
    });

    workout.cooldown.forEach((exercise, index) => {
      built.push({
        id: `cooldown-${index}`,
        phaseType: "work",
        phase: "Cool-down",
        blockTitle: "Cool-down",
        roundLabel: `Cycle ${index + 1}/${workout.cooldown.length}`,
        exercise,
      });
    });

    return built;
  }, [workout]);

  const workPhases = useMemo(
    () => phases.filter((phase) => phase.phaseType === "work"),
    [phases],
  );

  const serialMap = useMemo(() => {
    const map = new Map<string, number>();
    let currentSerial = 1;

    for (const phase of workPhases) {
      const key = serialKey(phase);
      if (!map.has(key)) {
        map.set(key, currentSerial);
        currentSerial += 1;
      }
    }

    return map;
  }, [workPhases]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.round(phases[0]?.exercise.durationSec ?? 0),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const replayCount = 0;
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isStoppingWorkout, setIsStoppingWorkout] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({
    rpe: "",
    load: "",
    notes: "",
  });
  const [performanceDraft, setPerformanceDraft] = useState<
    Record<string, { achievedValue: string; loadValue: string; notes: string }>
  >({});

  const ensureSessionStarted = useCallback(() => {
    if (hasStartedSession || !sessionId) {
      return;
    }

    setHasStartedSession(true);
    startTransition(async () => {
      await markWorkoutInProgressAction({
        sessionId,
        intensity: sessionIntensity,
      });
    });
  }, [hasStartedSession, sessionId, sessionIntensity]);

  const triggerPhaseStartCue = useCallback(async (phase: WorkoutPhase | null | undefined) => {
    if (!phase) {
      return;
    }

    const AudioContextClass =
      typeof window !== "undefined"
        ? window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;

    if (!AudioContextClass) {
      return;
    }

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return;
      }
    }

    playPhaseStartBoom(context, phase.phaseType);
  }, []);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const boundedIndex = Math.max(0, Math.min(nextIndex, phases.length - 1));
      setCurrentIndex(boundedIndex);
      setRemainingSeconds(Math.round(phases[boundedIndex]?.exercise.durationSec ?? 0));
      setIsCompleted(false);
    },
    [phases],
  );

  const goToNext = useCallback(() => {
    if (currentIndex < phases.length - 1) {
      ensureSessionStarted();
      const nextPhase = phases[currentIndex + 1];
      goToIndex(currentIndex + 1);
      setIsRunning(true);
      void triggerPhaseStartCue(nextPhase);
      return;
    }

    setRemainingSeconds(0);
    setIsRunning(false);
    setIsCompleted(true);
  }, [currentIndex, ensureSessionStarted, goToIndex, phases, triggerPhaseStartCue]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (remainingSeconds <= 1) {
        goToNext();
        return;
      }

      setRemainingSeconds((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [goToNext, isRunning, remainingSeconds]);

  useEffect(() => {
    const currentPhase = phases[currentIndex];

    if (!currentPhase || !isRunning || isCompleted || remainingSeconds < 1 || remainingSeconds > 3) {
      if (!isRunning || remainingSeconds > 3) {
        lastCountdownCueRef.current = null;
      }
      return;
    }

    const cueKey = `${currentPhase.id}:${remainingSeconds}`;
    if (lastCountdownCueRef.current === cueKey) {
      return;
    }

    lastCountdownCueRef.current = cueKey;

    const AudioContextClass =
      typeof window !== "undefined"
        ? window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;

    if (!AudioContextClass) {
      return;
    }

    const runBeep = async () => {
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;

      if (context.state === "suspended") {
        try {
          await context.resume();
        } catch {
          return;
        }
      }

      playCountdownBeep(context, remainingSeconds);
    };

    void runBeep();
  }, [currentIndex, isCompleted, isRunning, phases, remainingSeconds]);

  const currentPhase = phases[currentIndex];
  if (!currentPhase) {
    return null;
  }

  const totalDuration = phases.reduce(
    (sum, phase) => sum + phase.exercise.durationSec,
    0,
  );
  const elapsedDuration =
    phases
      .slice(0, currentIndex)
      .reduce((sum, phase) => sum + phase.exercise.durationSec, 0) +
    (currentPhase.exercise.durationSec - remainingSeconds);
  const totalRemaining = Math.max(totalDuration - elapsedDuration, 0);
  const currentPhaseDuration = currentPhase.exercise.durationSec;
  const currentPhaseProgress = currentPhaseDuration
    ? (currentPhaseDuration - remainingSeconds) / currentPhaseDuration
    : 0;
  const currentTimerOffset =
    TIMER_CIRCUMFERENCE - TIMER_CIRCUMFERENCE * Math.max(0, Math.min(1, currentPhaseProgress));
  const currentTarget =
    currentPhase.phaseType === "transition"
      ? "Reset"
      : currentPhase.exercise.targets[sessionIntensity];
  const nextWorkPhase =
    currentPhase.phaseType === "transition"
      ? phases.slice(currentIndex + 1).find((phase) => phase.phaseType === "work") ?? null
      : null;
  const currentSerial =
    currentPhase.phaseType === "work"
      ? serialMap.get(serialKey(currentPhase)) ?? 1
      : null;
  const displayPhase = currentPhase.phaseType === "transition" && nextWorkPhase
    ? nextWorkPhase
    : currentPhase;
  const displayTarget =
    currentPhase.phaseType === "transition" && nextWorkPhase
      ? nextWorkPhase.exercise.targets[sessionIntensity]
      : currentTarget;
  const displaySerial =
    currentPhase.phaseType === "transition" && nextWorkPhase
      ? serialMap.get(serialKey(nextWorkPhase)) ?? null
      : currentSerial;
  const recapItems = (() => {
    const items: Array<{
      id: string;
      phase: string;
      roundLabel: string;
      exercise: WorkoutExercise;
      serial: number;
    }> = [];
    const seen = new Set<string>();

    for (const phase of workPhases) {
      const key = serialKey(phase);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      items.push({
        id: phase.id,
        phase: phase.phase,
        roundLabel: phase.roundLabel,
        exercise: phase.exercise,
        serial: serialMap.get(key) ?? items.length + 1,
      });
    }

    return items;
  })();
  const recentRpeValues = completionInsights.recentFeedback
    .map((item) => item.rpe)
    .filter((value): value is number => value !== null);
  const rpeTrendLabel = recentRpeValues.length
    ? `${recentRpeValues.slice(0, 3).join(" • ")}`
    : "No previous RPE data";
  const recentLoadNotes = completionInsights.recentFeedback
    .map((item) => item.loadSummary)
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);
  const latestLoggedFeedback = completionInsights.recentFeedback.find(
    (item) => item.loadSummary || item.notes || item.rpe !== null,
  );
  const completedExercisesLabel = `${recapItems.length}`;
  const durationLabel = `${Math.round(totalDuration / 60)} min`;
  const projectedSessionsLeftLabel =
    activeMember.tierType === "monthly_unlimited"
      ? "Unlimited"
      : `${completionInsights.projectedSessionsLeft}`;
  const latestEntryByExercise = (() => {
    const map = new Map<string, ExercisePerformanceEntry>();

    for (const item of completionInsights.recentFeedback) {
      for (const entry of item.exerciseEntries) {
        if (!map.has(entry.exerciseName)) {
          map.set(entry.exerciseName, entry);
        }
      }
    }

    return map;
  })();

  const buildExerciseEntries = () =>
    recapItems.map((item) => {
      const draft = performanceDraft[item.id];
      return {
        exerciseKey: item.id,
        exerciseName: item.exercise.name,
        serial: item.serial,
        phase: item.phase,
        roundLabel: item.roundLabel,
        equipment: item.exercise.equipment,
        targetLabel: item.exercise.targets.base,
        targetUnit: item.exercise.targets.base.split(" ").slice(-1)[0] ?? "",
        achievedValue: draft?.achievedValue ?? null,
        loadValue: draft?.loadValue ?? null,
        notes: draft?.notes ?? null,
      } satisfies ExercisePerformanceEntry;
    });

  const goToPrevious = () => {
    if (currentIndex > 0) {
      ensureSessionStarted();
      const previousPhase = phases[currentIndex - 1];
      goToIndex(currentIndex - 1);
      setIsRunning(true);
      void triggerPhaseStartCue(previousPhase);
    }
  };

  const toggleRunning = () => {
    if (!access.allowed) {
      return;
    }

    ensureSessionStarted();
    setIsRunning((running) => {
      const nextRunning = !running;

      if (nextRunning && remainingSeconds === currentPhase.exercise.durationSec) {
        void triggerPhaseStartCue(currentPhase);
      }

      return nextRunning;
    });
  };

  const stopWorkout = () => {
    if (!sessionId || isStoppingWorkout) {
      return;
    }

    const confirmed = window.confirm(
      "Stop this workout now? Your workout will end immediately and the session credit will still be used.",
    );

    if (!confirmed) {
      return;
    }

    setIsStoppingWorkout(true);
    setSaveError(null);
    setSaveMessage(null);

    startTransition(async () => {
      const result = await stopWorkoutEarlyAction({
        sessionId,
        intensity: sessionIntensity,
      });

      if (!result.ok) {
        setSaveError(result.message);
        setIsStoppingWorkout(false);
        return;
      }

      router.push("/player");
      router.refresh();
    });
  };

  if (isCompleted) {
    return (
      <main className="min-h-screen bg-[#03080b] px-4 py-5 text-stone-50">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-24">
          <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(8,19,23,0.98)_0%,rgba(7,15,18,0.96)_100%)] p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_28%)]" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
                Workout complete
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {workout.category} complete
              </h1>
              <p className="mt-2 text-sm text-stone-300">
                {activeMember.name}, you locked in another full session.
              </p>
              <p className="mt-4 inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                {completionInsights.consistencyBadge}
              </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CompletionStat label="Duration" value={durationLabel} />
              <CompletionStat label="Program" value={workout.category} />
              <CompletionStat label="Exercises" value={completedExercisesLabel} />
            </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">
                  Session summary
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  Completed on {workout.dayLabel} for {activeMember.name}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">
                  Focus
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{workout.focus}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <SummaryTile
                title="Membership usage"
                lines={[
                  `Sessions left: ${projectedSessionsLeftLabel}`,
                  completionInsights.weeklyLimit
                    ? `Weekly sessions used: ${completionInsights.projectedWeeklyUsed}/${completionInsights.weeklyLimit}`
                    : `Weekly sessions used: ${completionInsights.projectedWeeklyUsed}`,
                ]}
              />
              <SummaryTile
                title="Achievement"
                lines={[
                  `Current streak: ${completionInsights.streakCount} day${completionInsights.streakCount === 1 ? "" : "s"}`,
                  `You completed ${completionInsights.projectedWeeklyUsed} session${completionInsights.projectedWeeklyUsed === 1 ? "" : "s"} this week`,
                  `Badge unlocked: ${completionInsights.consistencyBadge}`,
                ]}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col items-start gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Save this session</p>
                <p className="mt-2 text-sm text-stone-300">
                  Log today’s effort so Ravqen can build real movement history, personal bests, and smarter next targets.
                </p>
              </div>
              <button
                type="button"
                disabled={isSavingFeedback || !sessionId}
                onClick={() => {
                  if (!sessionId) {
                    setSaveError("No session record available to save.");
                    return;
                  }

                  const invalidCalories = buildExerciseEntries().find(
                    (entry) =>
                      entry.targetUnit.toLowerCase().includes("calories") &&
                      entry.achievedValue &&
                      !isPositiveNumeric(entry.achievedValue),
                  );

                  if (feedback.rpe && (!/^\d+$/.test(feedback.rpe) || Number(feedback.rpe) < 1 || Number(feedback.rpe) > 10)) {
                    setSaveError("RPE must be a whole number between 1 and 10.");
                    return;
                  }

                  if (invalidCalories) {
                    setSaveError(`${invalidCalories.exerciseName} calories must be a positive number.`);
                    return;
                  }

                  setIsSavingFeedback(true);
                  setSaveError(null);
                  setSaveMessage(null);

                  startTransition(async () => {
                    const result = await saveWorkoutCompletionAction({
                      sessionId,
                      intensity: sessionIntensity,
                      replayCount,
                      rpe: feedback.rpe ? Number(feedback.rpe) : null,
                      loadSummary: feedback.load,
                      notes: feedback.notes,
                      exerciseEntries: buildExerciseEntries(),
                    });

                    if (!result.ok) {
                      setSaveError(result.message);
                      setIsSavingFeedback(false);
                      return;
                    }

                    setIsSavingFeedback(false);
                    router.replace("/player");
                    router.refresh();
                  });
                }}
                className="hidden rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
              >
                {isSavingFeedback ? "Saving..." : "Save and return"}
              </button>
            </div>
            <div className="space-y-4">
              <FormField label={workout.feedback.rpePrompt}>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={feedback.rpe}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === "" || (/^\d+$/.test(nextValue) && Number(nextValue) >= 1 && Number(nextValue) <= 10)) {
                      setFeedback((current) => ({ ...current, rpe: nextValue }));
                    }
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
              </FormField>
              <FormField label={workout.feedback.loadPrompt}>
                <input
                  type="text"
                  value={feedback.load}
                  onChange={(event) =>
                    setFeedback((current) => ({ ...current, load: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
              </FormField>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                  Exercise performance
                </p>
                <div className="mt-4 space-y-3">
                  {recapItems.map((item) => {
                    const previousEntry = latestEntryByExercise.get(item.exercise.name);
                    const draft = performanceDraft[item.id] ?? {
                      achievedValue: "",
                      loadValue: "",
                      notes: "",
                    };

                    return (
                      <div
                        key={item.id}
                        className="rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                              {item.phase} • {item.roundLabel}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-white">
                              {item.serial}. {item.exercise.name}
                            </p>
                            <p className="mt-1 text-xs text-stone-400">
                              Target: {item.exercise.targets.base}
                            </p>
                          </div>
                          <p className="text-right text-xs text-stone-400">
                            Last load: {previousEntry?.loadValue ?? "None"}
                          </p>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <FormField label="Completed">
                            <input
                              type={item.exercise.targets.base.toLowerCase().includes("calories") ? "number" : "text"}
                              min={item.exercise.targets.base.toLowerCase().includes("calories") ? 1 : undefined}
                              value={draft.achievedValue}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                const expectsCalories = item.exercise.targets.base.toLowerCase().includes("calories");
                                if (expectsCalories && nextValue !== "" && !/^\d+(\.\d+)?$/.test(nextValue)) {
                                  return;
                                }
                                setPerformanceDraft((current) => ({
                                  ...current,
                                  [item.id]: {
                                    ...draft,
                                    achievedValue: nextValue,
                                  },
                                }));
                              }}
                              placeholder={item.exercise.targets.base}
                              className="w-full rounded-2xl border border-white/10 bg-[#071015] px-3 py-2 text-sm text-white outline-none"
                            />
                          </FormField>
                          <FormField label="Load used">
                            <input
                              value={draft.loadValue}
                              onChange={(event) =>
                                setPerformanceDraft((current) => ({
                                  ...current,
                                  [item.id]: {
                                    ...draft,
                                    loadValue: event.target.value,
                                  },
                                }))
                              }
                              placeholder="e.g. 18 kg"
                              className="w-full rounded-2xl border border-white/10 bg-[#071015] px-3 py-2 text-sm text-white outline-none"
                            />
                          </FormField>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <FormField label="Session notes">
                <textarea
                  rows={4}
                  value={feedback.notes}
                  onChange={(event) =>
                    setFeedback((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
                />
              </FormField>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/player")}
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
              >
                Back to dashboard
              </button>
            </div>

            {saveError ? (
              <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {saveError}
              </div>
            ) : null}
            {saveMessage ? (
              <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {saveMessage}
              </div>
            ) : null}

            {latestLoggedFeedback?.notes ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">
                  Last session note
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-100">
                  {latestLoggedFeedback.notes}
                </p>
              </div>
            ) : null}
          </section>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#03080b]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
            <div className="mx-auto w-full max-w-md">
              <button
                type="button"
                disabled={isSavingFeedback || !sessionId}
                onClick={() => {
                  if (!sessionId) {
                    setSaveError("No session record available to save.");
                    return;
                  }

                  const invalidCalories = buildExerciseEntries().find(
                    (entry) =>
                      entry.targetUnit.toLowerCase().includes("calories") &&
                      entry.achievedValue &&
                      !isPositiveNumeric(entry.achievedValue),
                  );

                  if (feedback.rpe && (!/^\d+$/.test(feedback.rpe) || Number(feedback.rpe) < 1 || Number(feedback.rpe) > 10)) {
                    setSaveError("RPE must be a whole number between 1 and 10.");
                    return;
                  }

                  if (invalidCalories) {
                    setSaveError(`${invalidCalories.exerciseName} calories must be a positive number.`);
                    return;
                  }

                  setIsSavingFeedback(true);
                  setSaveError(null);
                  setSaveMessage(null);

                  startTransition(async () => {
                    const result = await saveWorkoutCompletionAction({
                      sessionId,
                      intensity: sessionIntensity,
                      replayCount,
                      rpe: feedback.rpe ? Number(feedback.rpe) : null,
                      loadSummary: feedback.load,
                      notes: feedback.notes,
                      exerciseEntries: buildExerciseEntries(),
                    });

                    if (!result.ok) {
                      setSaveError(result.message);
                      setIsSavingFeedback(false);
                      return;
                    }

                    setIsSavingFeedback(false);
                    router.replace("/player");
                    router.refresh();
                  });
                }}
                className="w-full rounded-full bg-cyan-300 px-5 py-4 text-base font-semibold text-slate-950 shadow-[0_12px_30px_rgba(103,232,249,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingFeedback ? "Saving..." : "Save and return"}
              </button>
            </div>
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Recent progress</p>
            <div className="mt-4 grid gap-3">
              <SummaryTile
                title="RPE trend"
                lines={[rpeTrendLabel]}
              />
              <SummaryTile
                title="Recent load notes"
                lines={recentLoadNotes.length ? recentLoadNotes : ["No recent load notes yet."]}
              />
            </div>
            {completionInsights.personalBests.movementBests.length ? (
              <div className="mt-4 grid gap-3">
                {completionInsights.personalBests.movementBests.slice(0, 4).map((item) => (
                  <div
                    key={`${item.movement}-${item.loadLabel}`}
                    className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                      Movement best
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-white">{item.movement}</p>
                      <p className="text-sm font-semibold text-cyan-100">{item.loadLabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {completionInsights.recentFeedback.length ? (
              <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">
                  Last logged sessions
                </p>
                <div className="mt-3 space-y-3">
                  {completionInsights.recentFeedback.slice(0, 3).map((item, index) => (
                    <div
                      key={`${item.scheduledFor}-${item.workoutLabel}-${index}`}
                      className="flex items-start justify-between gap-3 border-t border-white/6 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.workoutLabel}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">
                          {formatSessionDate(item.scheduledFor)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-stone-300">
                        <p>RPE {item.rpe ?? "-"}</p>
                        <p className="mt-1 max-w-[10rem] text-wrap">
                          {item.loadSummary ?? "No load note"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Next workout</p>
            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white">
                {completionInsights.tomorrowWorkout.dayLabel}: {completionInsights.tomorrowWorkout.category}
              </p>
              <p className="mt-2 text-sm text-stone-300">
                Next session opens at {completionInsights.tomorrowWorkout.availableAt}.
              </p>
              <p className="mt-2 text-sm text-stone-400">
                Come back tomorrow to keep the rotation moving.
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Exercise recap</p>
            <div className="mt-4 space-y-3">
              {recapItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                      {item.phase} • {item.roundLabel}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {item.serial}. {item.exercise.name}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">{item.exercise.equipment}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
                      Completed
                    </p>
                    <p className="mt-1 text-sm text-stone-100">{item.exercise.targets.base}</p>
                    <p className="mt-2 max-w-[9rem] text-xs text-stone-400">
                      Last load: {latestEntryByExercise.get(item.exercise.name)?.loadValue ?? "Add today’s load below"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#17353c_0%,#071015_38%,#020507_100%)] px-4 py-5 text-stone-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-28">
        {legal.required ? (
          <section className="rounded-[1.6rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-100">Acceptance required</p>
            <p className="mt-2 text-sm leading-6 text-amber-50">
              Complete the Ravqen waiver and terms before starting your first workout.
            </p>
          </section>
        ) : null}

        <section className="rounded-[1.6rem] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Signed in</p>
              <p className="mt-1 text-sm font-semibold text-white">{activeMember.email}</p>
              <p className="mt-1 text-xs text-stone-400">
                {access.completedThisWeek} session{access.completedThisWeek === 1 ? "" : "s"} completed this week
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={stopWorkout}
                disabled={!sessionId || isStoppingWorkout}
                className="rounded-full border border-rose-400/25 bg-rose-400/12 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStoppingWorkout ? "Stopping..." : "Stop workout"}
              </button>
              <Link
                href="/auth/logout"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Log out
              </Link>
            </div>
          </div>
        </section>

        {!access.allowed && access.message ? (
          <section className="rounded-[1.6rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-100">Access paused</p>
            <p className="mt-2 text-sm leading-6 text-amber-50">{access.message}</p>
          </section>
        ) : null}

        <section className="relative overflow-hidden rounded-[2.2rem] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(9,27,31,0.96)_0%,rgba(5,12,16,0.98)_100%)] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.08),transparent_28%)]" />

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
              {activeMember.name}
            </div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-100">
              {workout.dayLabel}
            </div>
            <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
              {workout.category}
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <TopStat label="Session" value={formatClock(totalRemaining)} />
            <TopStat
              label="Cycle"
              value={
                currentPhase.phaseType === "transition"
                  ? "Rest"
                  : extractCycle(currentPhase.roundLabel)
              }
            />
            <TopStat label="Exercise" value={displaySerial ? `${displaySerial}` : "-"} />
          </div>

          <div className="relative mt-4 overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#0d1518]">
            <div className="relative aspect-[4/3] bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)]">
              <DemoMedia
                src={displayPhase.exercise.mediaSrc}
                alt={displayPhase.exercise.mediaAlt}
                priority
              />
            </div>
            <div
              className={`space-y-3 px-4 py-4 ${
                currentPhase.phaseType === "transition"
                  ? "border-t border-amber-300/20 bg-[linear-gradient(180deg,rgba(76,46,18,0.82)_0%,rgba(28,18,10,0.9)_100%)]"
                  : "border-t border-white/6 bg-[linear-gradient(180deg,rgba(7,19,24,0.82)_0%,rgba(7,19,24,0.96)_100%)]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p
                    className={`text-sm font-semibold uppercase tracking-[0.26em] ${
                      currentPhase.phaseType === "transition"
                        ? "text-amber-200"
                        : "text-stone-300"
                    }`}
                  >
                    {currentPhase.phaseType === "transition" ? "Rest / transition" : currentPhase.phase}
                  </p>
                  <h1 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl">
                    {displayPhase.exercise.name}
                  </h1>
                  {currentPhase.phaseType === "transition" ? (
                    <div className="mt-3 rounded-[1.15rem] border border-amber-300/25 bg-[#1e1710] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <p className="text-sm font-medium text-amber-100">
                        Rest now. Next set: {displayPhase.phase} • {displayPhase.roundLabel}
                      </p>
                      <p className="mt-1 text-sm text-amber-50/80">
                        Get to the station, set the load, and prepare for the next effort.
                      </p>
                    </div>
                  ) : null}
                </div>
                <div
                  className={`rounded-[1.35rem] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                    currentPhase.phaseType === "transition"
                      ? "border border-amber-300/25 bg-[#1e1710]"
                      : "border border-cyan-300/20 bg-cyan-300/10"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100">
                    {currentPhase.phaseType === "transition" ? "Next target" : "Target"}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {displayTarget}
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(6,13,16,0.58)_100%)] px-3 py-5 sm:py-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(103,232,249,0.08),transparent_55%)]" />
                <div className="relative flex items-center justify-center gap-3">
                  <div className="relative flex h-[200px] w-[200px] items-center justify-center sm:h-[220px] sm:w-[220px]">
                    <svg
                      viewBox="0 0 200 200"
                      className="absolute inset-0 h-full w-full -rotate-90"
                      aria-hidden="true"
                    >
                      <circle
                        cx="100"
                        cy="100"
                        r={TIMER_RADIUS}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r={TIMER_RADIUS}
                        fill="none"
                        stroke={currentPhase.phaseType === "transition" ? "#f59e0b" : "#14b8a6"}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={TIMER_CIRCUMFERENCE}
                        strokeDashoffset={currentTimerOffset}
                        className="transition-all duration-700 ease-linear"
                      />
                    </svg>
                    <span className="relative text-4xl font-semibold tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.12)] sm:text-6xl">
                      {formatClock(remainingSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={toggleRunning}
              disabled={!access.allowed}
              className="flex-1 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(103,232,249,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={stopWorkout}
              disabled={!sessionId || isStoppingWorkout}
              className="flex-1 rounded-full border border-rose-400/25 bg-rose-400/12 px-5 py-3 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStoppingWorkout ? "Stopping..." : "Stop"}
            </button>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#020507]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
          <div className="mx-auto flex w-full max-w-md flex-col gap-2">
            <button
              type="button"
              onClick={toggleRunning}
              disabled={!access.allowed}
              className="w-full rounded-full bg-cyan-300 px-5 py-4 text-base font-semibold text-slate-950 shadow-[0_12px_30px_rgba(103,232,249,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? "Pause session" : "Start session"}
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={stopWorkout}
                disabled={!sessionId || isStoppingWorkout}
                className="rounded-full border border-rose-400/25 bg-rose-400/12 px-5 py-3.5 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStoppingWorkout ? "Stopping..." : "Stop"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.18)_0%,rgba(8,16,20,0.5)_100%)] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function CompletionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-black/20 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-sm font-medium text-stone-200">{label}</p>
      {children}
    </label>
  );
}
