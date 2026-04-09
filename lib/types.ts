import type {
  ExerciseEquipmentCategory,
  ExerciseMuscleCategory,
  ExerciseSessionUsage,
  ExerciseTypeCategory,
} from "@/lib/exercise-taxonomy";

export type IntensityLevel = "low" | "base" | "high";

export type ExerciseTargetMap = Record<IntensityLevel, string>;
export type ExercisePrescriptionType = "reps" | "time" | "hold" | "calories" | "distance" | "steps";

export type ExercisePerformanceEntry = {
  exerciseKey: string;
  exerciseName: string;
  serial: number;
  phase: string;
  roundLabel: string;
  equipment: string;
  targetLabel: string;
  targetUnit: string;
  achievedValue: string | null;
  loadValue: string | null;
  notes: string | null;
};

export type WorkoutExercise = {
  name: string;
  durationSec: number;
  restSec: number;
  cycles?: number;
  prescriptionType?: ExercisePrescriptionType;
  coachingNote?: string;
  mediaSourceType?: "internal" | "ymove" | "external";
  ymoveExerciseId?: string;
  ymoveExerciseSlug?: string;
  equipment: string;
  demoSummary: string;
  mediaSrc: string;
  mediaAlt: string;
  targets: ExerciseTargetMap;
  cues: string[];
  tags?: string[];
  muscleCategory?: ExerciseMuscleCategory;
  typeCategory?: ExerciseTypeCategory;
  equipmentCategory?: ExerciseEquipmentCategory;
  usageContexts?: ExerciseSessionUsage[];
};

export type WorkoutBlock = {
  title: string;
  format: string;
  rounds: number;
  exercises: WorkoutExercise[];
};

export type DailyWorkout = {
  slug: string;
  programId: string;
  programGroup: string;
  dayLabel: string;
  category: string;
  focus: string;
  scienceNote: string;
  estimatedDurationMin: number;
  warmup: WorkoutExercise[];
  cooldown: WorkoutExercise[];
  blocks: WorkoutBlock[];
  feedback: {
    rpePrompt: string;
    loadPrompt: string;
  };
};

export type WorkoutPhase = {
  id: string;
  phaseType: "work" | "transition";
  phase: string;
  blockTitle: string;
  roundLabel: string;
  exercise: WorkoutExercise;
};

export type WeeklyScheduleEntry = {
  day: string;
  programId: string;
  group: string;
  category: string;
  focus: string;
};
