import { getWorkoutForProgram } from "@/lib/data";
import { inferPrescriptionType, normalizeDailyWorkout } from "@/lib/coaching-framework";
import {
  inferExerciseTaxonomy,
  type ExerciseEquipmentCategory,
  type ExerciseMuscleCategory,
  type ExerciseSessionUsage,
  type ExerciseTypeCategory,
} from "@/lib/exercise-taxonomy";
import {
  getProgramDefinition,
  getRotationSchedule,
  programCatalog,
  rotationCalendar,
  weekdayLabels,
  type ProgramGroup,
} from "@/lib/program-catalog";
import type { DailyWorkout, ExercisePrescriptionType, WorkoutExercise } from "@/lib/types";

export type ProgramTimelineItem = {
  id: string;
  section: "Warm-up" | "Main session" | "Cool-down";
  blockTitle: string;
  exerciseName: string;
  mediaSourceType?: "internal" | "ymove" | "external";
  equipment: string;
  demoSummary: string;
  mediaSrc: string;
  mediaAlt: string;
  prescriptionType?: ExercisePrescriptionType;
  coachingNote?: string;
  cycles: number;
  targetValue: string;
  unit: string;
  restSec: number;
  durationSec: number;
  cues: string[];
  tags?: string[];
  muscleCategory?: ExerciseMuscleCategory;
  typeCategory?: ExerciseTypeCategory;
  equipmentCategory?: ExerciseEquipmentCategory;
  usageContexts?: ExerciseSessionUsage[];
  ymoveExerciseId?: string;
  ymoveExerciseSlug?: string;
};

export type ProgramDefinition = {
  id: string;
  group: ProgramGroup;
  category: string;
  focus: string;
  scienceNote: string;
  estimatedDurationMin: number;
  status?: "active" | "archived";
  kind?: "system" | "custom";
  timeline: ProgramTimelineItem[];
};

export type InternalExerciseLibraryEntry = {
  id: string;
  section: ProgramTimelineItem["section"];
  exerciseName: string;
  mediaSourceType: "internal" | "external";
  equipment: string;
  demoSummary: string;
  mediaSrc: string;
  mediaAlt: string;
  prescriptionType?: ExercisePrescriptionType;
  coachingNote?: string;
  targetValue: string;
  unit: string;
  cycles: number;
  restSec: number;
  durationSec: number;
  cues: string[];
  tags?: string[];
  muscleCategory?: ExerciseMuscleCategory;
  typeCategory?: ExerciseTypeCategory;
  equipmentCategory?: ExerciseEquipmentCategory;
  usageContexts?: ExerciseSessionUsage[];
  status?: "active" | "archived";
};

function inferTagsFromExercise(exercise: WorkoutExercise) {
  const tokens = `${exercise.name} ${exercise.equipment}`.toLowerCase();
  const tags = new Set<string>();

  if (tokens.includes("squat")) tags.add("squat");
  if (tokens.includes("hinge") || tokens.includes("rdl")) tags.add("hinge");
  if (tokens.includes("lunge")) tags.add("lunge");
  if (tokens.includes("bike") || tokens.includes("row") || tokens.includes("ski")) tags.add("erg");
  if (tokens.includes("treadmill") || tokens.includes("run")) tags.add("run");
  if (tokens.includes("mobility") || tokens.includes("reach") || tokens.includes("bridge")) tags.add("mobility");
  if (tokens.includes("barbell")) tags.add("barbell");
  if (tokens.includes("dumbbell")) tags.add("dumbbell");

  return Array.from(tags);
}

export type RotationCalendarSlot = {
  id: string;
  weekIndex: number;
  day: string;
  programId: string;
  category: string;
  group: ProgramGroup;
  focus: string;
};

export type DateProgramOverride = {
  id: string;
  date: string;
  programId: string;
  category: string;
  group: ProgramGroup;
  focus: string;
};

function inferUnit(target: string) {
  if (target.includes("calories")) return "calories";
  if (target.includes("metres")) return "metres";
  if (target.includes("hold")) return "seconds";
  if (target.includes("pace")) return "seconds";
  if (target.includes("steps")) return "steps";
  return "reps";
}

function inferValue(target: string) {
  const match = target.match(/\d+(\.\d+)?/);
  return match?.[0] ?? target;
}

function timelineItemFromExercise(
  exercise: WorkoutExercise,
  programId: string,
  section: ProgramTimelineItem["section"],
  blockTitle: string,
  index: number,
) {
  const taxonomy = inferExerciseTaxonomy({
    exerciseName: exercise.name,
    equipment: exercise.equipment,
    section,
  });

  return {
    id: `${programId}-${section.toLowerCase().replace(/\s+/g, "-")}-${index}`,
    section,
    blockTitle,
    exerciseName: exercise.name,
    mediaSourceType: "internal" as const,
    equipment: exercise.equipment,
    demoSummary: exercise.demoSummary,
    mediaSrc: exercise.mediaSrc,
    mediaAlt: exercise.mediaAlt,
    prescriptionType: exercise.prescriptionType ?? inferPrescriptionType(exercise.targets.base),
    coachingNote: exercise.coachingNote,
    cycles: exercise.cycles ?? 1,
    targetValue: inferValue(exercise.targets.base),
    unit: inferUnit(exercise.targets.base),
    restSec: exercise.restSec,
    durationSec: exercise.durationSec,
    cues: exercise.cues,
    tags: inferTagsFromExercise(exercise),
    muscleCategory: taxonomy.muscleCategory,
    typeCategory: taxonomy.typeCategory,
    equipmentCategory: taxonomy.equipmentCategory,
    usageContexts: taxonomy.usageContexts,
  };
}

export function programDefinitionFromWorkout(workout: DailyWorkout): ProgramDefinition {
  const timeline: ProgramTimelineItem[] = [
    ...workout.warmup.map((exercise, index) =>
      timelineItemFromExercise(exercise, workout.programId, "Warm-up", "Warm-up", index),
    ),
    ...workout.blocks.flatMap((block) =>
      block.exercises.map((exercise, exerciseIndex) =>
        timelineItemFromExercise(
          exercise,
          workout.programId,
          "Main session",
          block.title,
          exerciseIndex,
        ),
      ),
    ),
    ...workout.cooldown.map((exercise, index) =>
      timelineItemFromExercise(
        exercise,
        workout.programId,
        "Cool-down",
        "Cool-down",
        index,
      ),
    ),
  ];

  return {
    id: workout.programId,
    group: workout.programGroup as ProgramGroup,
    category: workout.category,
    focus: workout.focus,
    scienceNote: workout.scienceNote,
    estimatedDurationMin: workout.estimatedDurationMin,
    status: "active",
    kind: "system",
    timeline,
  };
}

export function workoutFromProgramDefinition(
  program: ProgramDefinition,
  dayLabel = "Library",
): DailyWorkout {
  const baseWorkout = getWorkoutForProgram(program.id, dayLabel);
  const buildExercise = (item: ProgramTimelineItem): WorkoutExercise => ({
    name: item.exerciseName,
    durationSec: item.durationSec,
    restSec: item.restSec,
    cycles: item.cycles,
    prescriptionType: item.prescriptionType,
    coachingNote: item.coachingNote,
    mediaSourceType: item.mediaSourceType ?? "internal",
    ymoveExerciseId: item.ymoveExerciseId,
    ymoveExerciseSlug: item.ymoveExerciseSlug,
    equipment: item.equipment,
    demoSummary: item.demoSummary,
    mediaSrc: item.mediaSrc,
    mediaAlt: item.mediaAlt,
    targets: {
      low: `${item.targetValue} ${item.unit}`.trim(),
      base: `${item.targetValue} ${item.unit}`.trim(),
      high: `${item.targetValue} ${item.unit}`.trim(),
    },
    cues: item.cues,
    tags: item.tags ?? [],
    muscleCategory: item.muscleCategory,
    typeCategory: item.typeCategory,
    equipmentCategory: item.equipmentCategory,
    usageContexts: item.usageContexts,
  });

  return normalizeDailyWorkout({
    ...baseWorkout,
    dayLabel,
    focus: program.focus,
    scienceNote: program.scienceNote,
    blocks: [
      {
        ...baseWorkout.blocks[0],
        format: program.focus,
        rounds: 1,
        exercises: program.timeline
          .filter((item) => item.section === "Main session")
          .map(buildExercise),
      },
    ],
    warmup: program.timeline
      .filter((item) => item.section === "Warm-up")
      .map(buildExercise),
    cooldown: program.timeline
      .filter((item) => item.section === "Cool-down")
      .map(buildExercise),
  });
}

export function getProgramDefinitions(): ProgramDefinition[] {
  return programCatalog.map((program) =>
    programDefinitionFromWorkout(getWorkoutForProgram(program.id, "Library")),
  );
}

export function getRotationCalendarSlots(): RotationCalendarSlot[] {
  return rotationCalendar.flatMap((week, weekIndex) =>
    week.map((programId, dayIndex) => {
      const program = getProgramDefinition(programId);

      return {
        id: `week-${weekIndex + 1}-${weekdayLabels[dayIndex]}`,
        weekIndex,
        day: weekdayLabels[dayIndex],
        programId,
        category: program.name,
        group: program.group,
        focus: program.focus,
      };
    }),
  );
}

export function getCurrentWeekScheduleSummary(date = new Date()) {
  return getRotationSchedule(date);
}
