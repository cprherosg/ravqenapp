export const MUSCLE_SUBCATEGORIES = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Full Body",
  "Forearms",
] as const;

export const TYPE_SUBCATEGORIES = [
  "Strength",
  "Yoga",
  "Stretching",
  "Cardio",
  "Calisthenics",
  "Balance",
  "Core",
  "Isometric",
  "Plyometric",
] as const;

export const EQUIPMENT_SUBCATEGORIES = [
  "Bodyweight",
  "Dumbbell",
  "Barbell",
  "Cable",
  "Machine",
  "Kettlebell",
] as const;

export const SESSION_USAGE_OPTIONS = [
  "Warm-up",
  "Main session",
  "Cool-down",
] as const;

export type ExerciseMuscleCategory = (typeof MUSCLE_SUBCATEGORIES)[number];
export type ExerciseTypeCategory = (typeof TYPE_SUBCATEGORIES)[number];
export type ExerciseEquipmentCategory = (typeof EQUIPMENT_SUBCATEGORIES)[number];
export type ExerciseSessionUsage = (typeof SESSION_USAGE_OPTIONS)[number];

function includesAny(source: string, tokens: string[]) {
  return tokens.some((token) => source.includes(token));
}

export function inferExerciseTaxonomy(input: {
  exerciseName: string;
  equipment?: string;
  section?: ExerciseSessionUsage;
}) {
  const source = `${input.exerciseName} ${input.equipment ?? ""}`.toLowerCase();

  const muscleCategory: ExerciseMuscleCategory =
    includesAny(source, ["chest", "bench press", "push up", "push-up", "crossover", "fly"])
      ? "Chest"
      : includesAny(source, ["row", "pulldown", "pull up", "pull-up", "back"])
        ? "Back"
        : includesAny(source, ["shoulder", "lateral raise", "front raise", "overhead press", "military press", "face pull"])
          ? "Shoulders"
          : includesAny(source, ["bicep", "curl", "hammer curl"])
            ? "Biceps"
            : includesAny(source, ["tricep", "pushdown", "dip", "skull crusher"])
              ? "Triceps"
              : includesAny(source, ["squat", "leg press", "leg extension", "lunge", "split squat", "step up", "step-up"])
                ? "Quads"
                : includesAny(source, ["rdl", "romanian deadlift", "leg curl", "hamstring", "good morning"])
                  ? "Hamstrings"
                  : includesAny(source, ["glute", "hip thrust", "bridge", "kickback"])
                    ? "Glutes"
                    : includesAny(source, ["calf"])
                      ? "Calves"
                      : includesAny(source, ["plank", "ab rollout", "ab ", "crunch", "hollow", "sit up", "sit-up", "russian twist", "mountain climber"])
                        ? "Core"
                        : includesAny(source, ["carry", "burpee", "thruster", "clean", "snatch", "hyrox", "run", "row", "ski", "bike"])
                          ? "Full Body"
                          : includesAny(source, ["wrist", "forearm", "grip"])
                            ? "Forearms"
                            : "Full Body";

  const typeCategory: ExerciseTypeCategory =
    includesAny(source, ["yoga", "downward dog", "cobra", "cat cow"])
      ? "Yoga"
      : includesAny(source, ["stretch", "mobility"])
        ? "Stretching"
        : includesAny(source, ["run", "row", "bike", "ski", "jump rope", "burpee", "high knees"])
          ? "Cardio"
          : includesAny(source, ["push up", "push-up", "pull up", "pull-up", "dip", "plank", "archer", "bodyweight"])
            ? "Calisthenics"
            : includesAny(source, ["balance", "single leg", "single-leg", "bosu"])
              ? "Balance"
              : includesAny(source, ["plank", "ab rollout", "crunch", "hollow", "mountain climber"])
                ? "Core"
                : includesAny(source, ["hold", "wall sit", "plank"])
                  ? "Isometric"
                  : includesAny(source, ["jump", "plyo", "broad jump", "box jump"])
                    ? "Plyometric"
                    : "Strength";

  const equipmentCategory: ExerciseEquipmentCategory =
    includesAny(source, ["barbell"])
      ? "Barbell"
      : includesAny(source, ["dumbbell"])
        ? "Dumbbell"
        : includesAny(source, ["cable"])
          ? "Cable"
          : includesAny(source, ["machine", "leg press", "leg extension", "leg curl", "lat pulldown", "seated row"])
            ? "Machine"
            : includesAny(source, ["kettlebell"])
              ? "Kettlebell"
              : "Bodyweight";

  const usageContexts = new Set<ExerciseSessionUsage>();
  if (input.section) {
    usageContexts.add(input.section);
  }

  if (typeCategory === "Stretching" || typeCategory === "Yoga" || typeCategory === "Balance") {
    usageContexts.add("Warm-up");
    usageContexts.add("Cool-down");
  }

  if (typeCategory === "Cardio" || typeCategory === "Calisthenics") {
    usageContexts.add("Warm-up");
    usageContexts.add("Main session");
  }

  if (typeCategory === "Strength" || typeCategory === "Core" || typeCategory === "Isometric" || typeCategory === "Plyometric") {
    usageContexts.add("Main session");
  }

  if (!usageContexts.size) {
    usageContexts.add("Main session");
  }

  return {
    muscleCategory,
    typeCategory,
    equipmentCategory,
    usageContexts: Array.from(usageContexts),
  };
}
