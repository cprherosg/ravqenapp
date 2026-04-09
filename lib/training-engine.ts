import type { MemberProfile } from "@/lib/admin-data";
import type { DailyWorkout, ExercisePerformanceEntry, WorkoutExercise } from "@/lib/types";
import type { ProgramId } from "@/lib/program-catalog";

export type ProgrammingEngineSnapshot = {
  blockName: string;
  blockWeekLabel: string;
  weekInBlock: number;
  blockNumber: number;
  phaseLabel: "Build" | "Deload";
  progressionFocus: string;
  adaptationRule: string;
  substitutionRule: string;
  mediaPipeline: string;
};

type ExerciseSubstitution = {
  match: string;
  replacementName: string;
  replacementEquipment: string;
  replacementMediaSrc: string;
  replacementMediaAlt: string;
  replacementSummary: string;
  replacementCues: string[];
};

type ProgramProgressionProfile = {
  buildFocus: string[];
  deloadFocus: string;
  baseCycleChange: number[];
  restAdjustmentByWeek: number[];
  targetAdjustmentByWeek: number[];
};

const progressionProfiles: Record<ProgramId, ProgramProgressionProfile> = {
  complimentary: {
    buildFocus: [
      "Week 1 establishes confident machine and dumbbell setup.",
      "Week 2 adds a small workload bump while keeping technique simple.",
      "Week 3 increases repeatable full-body training density without rushing positions.",
    ],
    deloadFocus:
      "Week 4 keeps the same movement pool but lowers total stress so confidence and recovery stay high.",
    baseCycleChange: [0, 0, 1, -1],
    restAdjustmentByWeek: [0, -5, -5, 12],
    targetAdjustmentByWeek: [0, 3, 5, -10],
  },
  strength: {
    buildFocus: [
      "Week 1 establishes load and clean bracing on the main lifts.",
      "Week 2 adds a small workload bump while keeping longer recovery.",
      "Week 3 pushes force production with slightly denser top sets.",
    ],
    deloadFocus: "Week 4 reduces volume and extends rest so force stays crisp while fatigue comes down.",
    baseCycleChange: [0, 0, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 15],
    targetAdjustmentByWeek: [0, 4, 8, -12],
  },
  hyrox: {
    buildFocus: [
      "Week 1 builds sustainable run-to-station rhythm.",
      "Week 2 tightens transitions and slightly increases station demand.",
      "Week 3 raises race-specific pressure with denser running and carries.",
    ],
    deloadFocus: "Week 4 preserves the race sequence but lowers station density to restore legs and lungs.",
    baseCycleChange: [0, 0, 0, 0],
    restAdjustmentByWeek: [0, -5, -10, 20],
    targetAdjustmentByWeek: [0, 5, 10, -15],
  },
  "cardio-hiit": {
    buildFocus: [
      "Week 1 establishes interval quality and repeat speed.",
      "Week 2 keeps intervals sharp while trimming recovery.",
      "Week 3 peaks anaerobic demand with the tightest recovery of the block.",
    ],
    deloadFocus: "Week 4 backs off interval pressure and restores recovery between surges.",
    baseCycleChange: [0, 1, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 15],
    targetAdjustmentByWeek: [0, 4, 6, -12],
  },
  balanced: {
    buildFocus: [
      "Week 1 locks in range, control, and movement quality.",
      "Week 2 adds gentle density without rushing positions.",
      "Week 3 challenges stability by extending time under tension.",
    ],
    deloadFocus: "Week 4 keeps the patterns but softens density so joints and connective tissue recover.",
    baseCycleChange: [0, 0, 1, -1],
    restAdjustmentByWeek: [0, 0, -5, 10],
    targetAdjustmentByWeek: [0, 2, 4, -10],
  },
  pump: {
    buildFocus: ["Week 1 builds volume.", "Week 2 increases density.", "Week 3 peaks local fatigue."],
    deloadFocus: "Week 4 backs down total volume while keeping the pump feel.",
    baseCycleChange: [0, 1, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 15],
    targetAdjustmentByWeek: [0, 5, 8, -12],
  },
  hyper: {
    buildFocus: ["Week 1 establishes tension.", "Week 2 increases reps or control.", "Week 3 pushes hypertrophy density."],
    deloadFocus: "Week 4 preserves range and tempo with lower total stress.",
    baseCycleChange: [0, 0, 1, -1],
    restAdjustmentByWeek: [0, -5, -5, 10],
    targetAdjustmentByWeek: [0, 4, 6, -10],
  },
  hirt: {
    buildFocus: ["Week 1 sets structure.", "Week 2 trims idle time.", "Week 3 raises repeat effort demand."],
    deloadFocus: "Week 4 restores recovery to maintain movement quality.",
    baseCycleChange: [0, 1, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 15],
    targetAdjustmentByWeek: [0, 4, 8, -10],
  },
  power: {
    buildFocus: ["Week 1 grooves explosiveness.", "Week 2 sharpens speed.", "Week 3 peaks intent with clean reps."],
    deloadFocus: "Week 4 cuts fatigue and preserves speed.",
    baseCycleChange: [0, 0, 0, -1],
    restAdjustmentByWeek: [0, 0, -5, 15],
    targetAdjustmentByWeek: [0, 2, 4, -10],
  },
  "cardio-summit": {
    buildFocus: ["Week 1 sets aerobic pace.", "Week 2 extends sustainable output.", "Week 3 raises threshold demand."],
    deloadFocus: "Week 4 lowers interval pressure to restore aerobic freshness.",
    baseCycleChange: [0, 0, 1, -1],
    restAdjustmentByWeek: [0, -5, -5, 10],
    targetAdjustmentByWeek: [0, 3, 5, -10],
  },
  "cardio-u": {
    buildFocus: ["Week 1 establishes pacing.", "Week 2 challenges recovery.", "Week 3 improves repeat capacity."],
    deloadFocus: "Week 4 lowers repeat demand and reinforces smooth pacing.",
    baseCycleChange: [0, 0, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 12],
    targetAdjustmentByWeek: [0, 3, 6, -10],
  },
  crewfit: {
    buildFocus: ["Week 1 builds rhythm.", "Week 2 adds work rate.", "Week 3 peaks mixed-modality output."],
    deloadFocus: "Week 4 restores breathing room between efforts.",
    baseCycleChange: [0, 1, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 12],
    targetAdjustmentByWeek: [0, 4, 6, -10],
  },
  xtx: {
    buildFocus: ["Week 1 links resistance and conditioning smoothly.", "Week 2 shortens transitions.", "Week 3 drives denser complexes."],
    deloadFocus: "Week 4 lowers total density while preserving sequencing.",
    baseCycleChange: [0, 0, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 12],
    targetAdjustmentByWeek: [0, 4, 6, -10],
  },
  "strength-endurance": {
    buildFocus: ["Week 1 sets repeat strength.", "Week 2 trims rest slightly.", "Week 3 holds force under fatigue."],
    deloadFocus: "Week 4 lowers fatigue and restores clean output.",
    baseCycleChange: [0, 0, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 12],
    targetAdjustmentByWeek: [0, 3, 6, -10],
  },
  shred: {
    buildFocus: ["Week 1 establishes session density.", "Week 2 raises repeat work.", "Week 3 pushes total output."],
    deloadFocus: "Week 4 lowers demand while preserving the calorie-burn feel.",
    baseCycleChange: [0, 1, 1, -1],
    restAdjustmentByWeek: [0, -5, -10, 12],
    targetAdjustmentByWeek: [0, 4, 6, -10],
  },
};

function currentSingaporeDate(date = new Date()) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return new Date(`${dateKey}T00:00:00+08:00`);
}

export function getProgrammingEngineSnapshot(date = new Date()): ProgrammingEngineSnapshot {
  const current = currentSingaporeDate(date);
  const start = new Date("2026-01-05T00:00:00+08:00");
  const diffMs = current.getTime() - start.getTime();
  const elapsedWeeks = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)));
  const weekInBlock = (elapsedWeeks % 4) + 1;
  const blockNumber = Math.floor(elapsedWeeks / 4) + 1;
  const isDeload = weekInBlock === 4;

  return {
    blockName: `Block ${blockNumber}`,
    blockWeekLabel: `Week ${weekInBlock} of 4`,
    weekInBlock,
    blockNumber,
    phaseLabel: isDeload ? "Deload" : "Build",
    progressionFocus: isDeload
      ? "Reduce volume, preserve intent, and keep movement quality high."
      : "Progress workload through denser intervals, cleaner movement, and tighter pacing.",
    adaptationRule:
      "RPE, load notes, and repeat frequency steer the next targets instead of random daily jumps.",
    substitutionRule:
      "Equipment overrides preserve training intent first: sled to treadmill push, SkiErg to row, barbell to dumbbell.",
    mediaPipeline:
      "Use Ymove references now, refresh signed media server-side, and transition key movements to Ravqen-owned media over time.",
  };
}

function getTargetFactor(phaseLabel: "Build" | "Deload", recentRpeValues: number[]) {
  let factor = phaseLabel === "Deload" ? 0.82 : 1;
  const averageRpe =
    recentRpeValues.length > 0
      ? recentRpeValues.reduce((sum, value) => sum + value, 0) / recentRpeValues.length
      : null;

  if (averageRpe !== null && averageRpe >= 8.5) {
    factor *= 0.92;
  } else if (averageRpe !== null && averageRpe <= 6.5) {
    factor *= 1.06;
  }

  return factor;
}

function getWeekProgressionFactor(weekInBlock: number) {
  if (weekInBlock === 4) return 0.82;
  if (weekInBlock === 3) return 1.08;
  if (weekInBlock === 2) return 1.04;
  return 1;
}

function getProgramProfile(programId: string) {
  return progressionProfiles[(programId as ProgramId)] ?? progressionProfiles.strength;
}

function parseNumericValue(value: string | null | undefined) {
  const match = value?.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function adjustTargetText(target: string, factor: number) {
  return target.replace(/(\d+(?:\.\d+)?)/, (match) => {
    const value = Number(match);
    if (!Number.isFinite(value)) {
      return match;
    }

    const adjusted = Math.max(1, Math.round(value * factor));
    return `${adjusted}`;
  });
}

function getSubstitutionCatalog(context: string): ExerciseSubstitution[] {
  const normalized = context.toLowerCase();
  const substitutions: ExerciseSubstitution[] = [];

  if (normalized.includes("no ski erg") || normalized.includes("ski erg")) {
    substitutions.push({
      match: "ski erg",
      replacementName: "Row erg power pull",
      replacementEquipment: "Row erg",
      replacementMediaSrc: "/exercise-media/row-erg.svg",
      replacementMediaAlt: "Row erg power pull demo",
      replacementSummary: "Rowing substitute that preserves whole-body power and aerobic strain.",
      replacementCues: ["Drive through the legs", "Finish tall through the trunk"],
    });
  }

  if (normalized.includes("avoid sled") || normalized.includes("no sled")) {
    substitutions.push({
      match: "sled",
      replacementName: "Treadmill push walk",
      replacementEquipment: "Treadmill",
      replacementMediaSrc: "/exercise-media/treadmill-walk.svg",
      replacementMediaAlt: "Treadmill push walk demo",
      replacementSummary: "Incline treadmill push substitute that keeps lower-body drive and threshold demand high.",
      replacementCues: ["Lean slightly forward", "Drive through the full foot"],
    });
  }

  if (normalized.includes("avoid barbell") || normalized.includes("no barbell")) {
    substitutions.push({
      match: "barbell",
      replacementName: "Dumbbell front squat",
      replacementEquipment: "Dumbbells",
      replacementMediaSrc: "/exercise-media/bodyweight-squat.svg",
      replacementMediaAlt: "Dumbbell front squat demo",
      replacementSummary: "Dumbbell-led squat substitute when barbell setup is limited or not preferred.",
      replacementCues: ["Stay tall through the torso", "Control the bottom position"],
    });
  }

  if (normalized.includes("no dumbbell") || normalized.includes("avoid dumbbell")) {
    substitutions.push({
      match: "dumbbell",
      replacementName: "Barbell box squat",
      replacementEquipment: "Barbell",
      replacementMediaSrc: "/exercise-media/barbell-back-squat.svg",
      replacementMediaAlt: "Barbell box squat demo",
      replacementSummary: "Barbell-led substitute when heavier dumbbell work is limited.",
      replacementCues: ["Brace before each rep", "Own the descent and stand tall"],
    });
  }

  if (normalized.includes("no bike") || normalized.includes("avoid bike")) {
    substitutions.push({
      match: "bike",
      replacementName: "Treadmill threshold run",
      replacementEquipment: "Treadmill",
      replacementMediaSrc: "/exercise-media/treadmill-walk.svg",
      replacementMediaAlt: "Treadmill threshold run demo",
      replacementSummary: "Treadmill interval substitute when bike access is limited.",
      replacementCues: ["Build pace smoothly", "Stay relaxed through the shoulders"],
    });
  }

  return substitutions;
}

function applyExerciseSubstitution(
  exercise: WorkoutExercise,
  substitutions: ExerciseSubstitution[],
) {
  const normalizedName = exercise.name.toLowerCase();
  const normalizedEquipment = exercise.equipment.toLowerCase();
  const substitution = substitutions.find(
    (item) =>
      normalizedName.includes(item.match) || normalizedEquipment.includes(item.match),
  );

  if (!substitution) {
    return exercise;
  }

  return {
    ...exercise,
    name: substitution.replacementName,
    equipment: substitution.replacementEquipment,
    mediaSrc: substitution.replacementMediaSrc,
    mediaAlt: substitution.replacementMediaAlt,
    demoSummary: substitution.replacementSummary,
    cues: substitution.replacementCues,
  };
}

export function adaptWorkoutForMember(input: {
  workout: DailyWorkout;
  member: MemberProfile;
  recentRpeValues: number[];
  recentExerciseEntries?: ExercisePerformanceEntry[];
  date?: Date;
}) {
  const snapshot = getProgrammingEngineSnapshot(input.date);
  const programProfile = getProgramProfile(input.workout.programId);
  const factor =
    getTargetFactor(snapshot.phaseLabel, input.recentRpeValues) *
    getWeekProgressionFactor(snapshot.weekInBlock) *
    (1 + (programProfile.targetAdjustmentByWeek[snapshot.weekInBlock - 1] ?? 0) / 100);
  const substitutionContext = `${input.member.gymProfile} ${input.member.equipmentOverride}`;
  const substitutions = getSubstitutionCatalog(substitutionContext);
  const recentEntries = input.recentExerciseEntries ?? [];

  const adaptExercise = (exercise: WorkoutExercise) => {
    const substituted = applyExerciseSubstitution(exercise, substitutions);
    const matchingEntries = recentEntries.filter(
      (entry) => entry.exerciseName.toLowerCase() === substituted.name.toLowerCase(),
    );
    const recentLoads = matchingEntries
      .map((entry) => parseNumericValue(entry.loadValue))
      .filter((value): value is number => value !== null)
      .slice(0, 3);
    const averageCompletedTarget =
      matchingEntries.length > 0
        ? matchingEntries.reduce((sum, entry) => {
            const match = entry.achievedValue?.match(/(\d+(?:\.\d+)?)/);
            return sum + (match ? Number(match[1]) : 0);
          }, 0) / matchingEntries.length
        : null;
    const risingLoadTrend =
      recentLoads.length >= 2 && recentLoads[0] > recentLoads[1];
    const exerciseFatigueFlag = matchingEntries.some((entry) =>
      `${entry.notes ?? ""} ${entry.achievedValue ?? ""}`.toLowerCase().includes("fatigue"),
    );
    let targetFactor =
      averageCompletedTarget !== null && averageCompletedTarget > 0 ? factor * 1.02 : factor;

    if (risingLoadTrend) {
      targetFactor *= 1.03;
    }

    if (exerciseFatigueFlag) {
      targetFactor *= 0.96;
    }
    const adjustedCycles = Math.max(
      1,
      Math.round(
        (substituted.cycles ?? 1) +
          (programProfile.baseCycleChange[snapshot.weekInBlock - 1] ?? 0),
      ),
    );
    const adjustedRest =
      Math.max(
        15,
        Math.round(
          substituted.restSec +
            (programProfile.restAdjustmentByWeek[snapshot.weekInBlock - 1] ?? 0),
        ),
      );

    return {
      ...substituted,
      cycles: adjustedCycles,
      durationSec: Math.round(substituted.durationSec),
      restSec: adjustedRest,
      targets: {
        low: adjustTargetText(substituted.targets.low, targetFactor * 0.96),
        base: adjustTargetText(substituted.targets.base, targetFactor),
        high: adjustTargetText(substituted.targets.high, targetFactor * 1.04),
      },
    };
  };

  return {
    ...input.workout,
    focus:
      snapshot.phaseLabel === "Deload"
        ? `${input.workout.focus} ${programProfile.deloadFocus}`
        : `${input.workout.focus} ${programProfile.buildFocus[snapshot.weekInBlock - 1] ?? ""}`.trim(),
    scienceNote: `${input.workout.scienceNote} ${snapshot.adaptationRule}`,
    warmup: input.workout.warmup.map(adaptExercise),
    cooldown: input.workout.cooldown.map(adaptExercise),
    blocks: input.workout.blocks.map((block) => ({
      ...block,
      exercises: block.exercises.map(adaptExercise),
    })),
  };
}

export function extractMovementPersonalBests(loadSummaries: Array<string | null>) {
  const byMovement = new Map<string, number>();

  for (const summary of loadSummaries) {
    if (!summary) continue;
    const pairs = summary.split(/,|;/);

    for (const pair of pairs) {
      const match = pair.trim().match(/(.+?)\s+(\d+(?:\.\d+)?)\s*kg/i);
      if (!match) continue;
      const movement = match[1].trim();
      const load = Number(match[2]);
      if (!movement || !Number.isFinite(load)) continue;
      byMovement.set(movement, Math.max(load, byMovement.get(movement) ?? 0));
    }
  }

  return Array.from(byMovement.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([movement, load]) => ({
      movement,
      loadLabel: `${load} kg`,
    }));
}
