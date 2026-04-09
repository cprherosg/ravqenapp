import type { ProgramId } from "@/lib/program-catalog";
import type {
  ExercisePrescriptionType,
  WorkoutExercise,
} from "@/lib/types";

type WorkoutSection = "Warm-up" | "Main session" | "Cool-down";

type ProgramCoachingFramework = {
  goal: string;
  warmupRule: string;
  mainRule: string;
  cooldownRule: string;
  progressionRule: string;
  repCapSec: [number, number];
  timeCapSec: [number, number];
  holdCapSec: [number, number];
  caloriesCapSec: [number, number];
  distanceCapSec: [number, number];
  stepsCapSec: [number, number];
  restSec: [number, number];
  cycles: number;
};

const WARMUP_TIME_CAP_SEC: [number, number] = [30, 45];
const COOLDOWN_TIME_CAP_SEC: [number, number] = [30, 40];

function deriveWarmupCapSec(
  prescriptionType: ExercisePrescriptionType,
  targetLabel: string,
  exerciseName: string,
) {
  const numeric = parseNumeric(targetLabel);
  const name = exerciseName.toLowerCase();

  if (prescriptionType === "hold") {
    return Math.round(within(WARMUP_TIME_CAP_SEC, numeric ?? 30));
  }

  if (prescriptionType === "time") {
    return Math.round(within(WARMUP_TIME_CAP_SEC, numeric ?? 35));
  }

  if (prescriptionType === "steps") {
    return Math.round(within(WARMUP_TIME_CAP_SEC, Math.max(30, (numeric ?? 10) * 2.6)));
  }

  if (prescriptionType === "calories") {
    return Math.round(within(WARMUP_TIME_CAP_SEC, 45));
  }

  if (prescriptionType === "distance") {
    if (name.includes("run") || name.includes("treadmill")) {
      return Math.round(within(WARMUP_TIME_CAP_SEC, (numeric ?? 120) / 4.2));
    }

    return Math.round(within(WARMUP_TIME_CAP_SEC, 35));
  }

  if (name.includes("lunge") || name.includes("split squat")) {
    return Math.round(within(WARMUP_TIME_CAP_SEC, (numeric ?? 8) * 4));
  }

  return Math.round(within(WARMUP_TIME_CAP_SEC, (numeric ?? 8) * 3.8));
}

function deriveCooldownCapSec(
  prescriptionType: ExercisePrescriptionType,
  targetLabel: string,
) {
  const numeric = parseNumeric(targetLabel);

  if (prescriptionType === "hold") {
    return Math.round(within(COOLDOWN_TIME_CAP_SEC, numeric ?? 30));
  }

  if (prescriptionType === "time") {
    return Math.round(within(COOLDOWN_TIME_CAP_SEC, numeric ?? 30));
  }

  if (prescriptionType === "steps") {
    return Math.round(within(COOLDOWN_TIME_CAP_SEC, Math.max(30, (numeric ?? 8) * 2.4)));
  }

  if (prescriptionType === "distance") {
    return Math.round(within(COOLDOWN_TIME_CAP_SEC, 35));
  }

  return Math.round(within(COOLDOWN_TIME_CAP_SEC, (numeric ?? 8) * 3.5));
}

export const coachingFramework: Record<ProgramId, ProgramCoachingFramework> = {
  complimentary: {
    goal:
      "Build confidence with simple, stable full-body resistance work using machines and dumbbells.",
    warmupRule:
      "Use low-complexity rehearsal work to raise temperature and prepare joints without early fatigue.",
    mainRule:
      "Bias machine and dumbbell lifts toward clean sets of 8-14 reps, with enough rest to reset setup and technique each cycle.",
    cooldownRule:
      "Downshift with easy machine flush work and low-skill trunk or posture drills rather than aggressive stretching.",
    progressionRule:
      "Progress by small load bumps or one to two extra reps before adding complexity.",
    repCapSec: [45, 60],
    timeCapSec: [35, 50],
    holdCapSec: [30, 45],
    caloriesCapSec: [40, 60],
    distanceCapSec: [45, 70],
    stepsCapSec: [35, 50],
    restSec: [45, 60],
    cycles: 5,
  },
  strength: {
    goal: "Develop force production through heavy compound lifts with full technical control.",
    warmupRule:
      "Prepare the main patterns with bracing, hinge, squat, and single-leg rehearsal before load climbs.",
    mainRule:
      "Use lower-rep strength work, crisp bar speed, and longer rest so the member never has to rush quality reps.",
    cooldownRule:
      "Reduce tone in the tissues used most while gradually lowering breathing rate.",
    progressionRule:
      "Progress by slightly heavier working loads or one extra quality set, not by turning strength work into conditioning.",
    repCapSec: [35, 55],
    timeCapSec: [30, 45],
    holdCapSec: [30, 45],
    caloriesCapSec: [45, 60],
    distanceCapSec: [50, 70],
    stepsCapSec: [35, 50],
    restSec: [75, 105],
    cycles: 5,
  },
  pump: {
    goal: "Accumulate local muscular fatigue and metabolic stress with stable hypertrophy-friendly work.",
    warmupRule:
      "Prime the tissues you plan to chase with blood flow and controlled range before the first work set.",
    mainRule:
      "Use moderate loads, moderate-to-high reps, and shorter but still usable rest periods to keep a pump without turning sloppy.",
    cooldownRule:
      "Use light movement and easy breathing to bring local burn down.",
    progressionRule:
      "Progress through higher total reps, smoother tempo, and denser work before large load jumps.",
    repCapSec: [45, 65],
    timeCapSec: [35, 50],
    holdCapSec: [35, 50],
    caloriesCapSec: [35, 55],
    distanceCapSec: [40, 60],
    stepsCapSec: [35, 50],
    restSec: [35, 50],
    cycles: 5,
  },
  hyper: {
    goal: "Drive hypertrophy through repeatable tension, range, and unilateral control.",
    warmupRule:
      "Prepare the joints and ranges that will be loaded, especially hips, trunk, and scapular control.",
    mainRule:
      "Use 8-14 rep hypertrophy work with enough time to control the eccentric and enough rest to repeat quality.",
    cooldownRule:
      "Bring tone down through easy movement and position-based breathing, not rushing into the next thing.",
    progressionRule:
      "Progress through more tension, slightly more total reps, or cleaner control before load jumps.",
    repCapSec: [45, 70],
    timeCapSec: [35, 50],
    holdCapSec: [35, 50],
    caloriesCapSec: [35, 50],
    distanceCapSec: [40, 60],
    stepsCapSec: [35, 50],
    restSec: [40, 55],
    cycles: 5,
  },
  hirt: {
    goal: "Blend resistance and pressure so strength stays present while the heart rate rises.",
    warmupRule:
      "Prepare both the loaded patterns and the breathing system because the session gets demanding quickly.",
    mainRule:
      "Use resistance stations with enough time for clean work, then shorter recoveries to maintain session pressure.",
    cooldownRule:
      "Bring breathing down first, then use easy range-of-motion work to unload the main tissues.",
    progressionRule:
      "Progress by tightening recovery and slightly increasing repeat demand without losing movement quality.",
    repCapSec: [40, 55],
    timeCapSec: [30, 45],
    holdCapSec: [30, 45],
    caloriesCapSec: [30, 50],
    distanceCapSec: [35, 60],
    stepsCapSec: [30, 45],
    restSec: [30, 45],
    cycles: 5,
  },
  power: {
    goal: "Express force fast and keep every explosive rep sharp.",
    warmupRule:
      "Use warm-up work that raises neural readiness, joint stiffness, and landing or bracing quality.",
    mainRule:
      "Keep work bouts short and explosive, with enough rest that speed and intent stay high.",
    cooldownRule:
      "Let the nervous system settle through calm breathing and easy tissue unloading.",
    progressionRule:
      "Progress only while speed stays high; once intent drops, volume should stop climbing.",
    repCapSec: [20, 35],
    timeCapSec: [20, 35],
    holdCapSec: [20, 35],
    caloriesCapSec: [20, 40],
    distanceCapSec: [25, 45],
    stepsCapSec: [20, 35],
    restSec: [55, 80],
    cycles: 6,
  },
  hyrox: {
    goal: "Prepare the member for race-style repeat running and station execution under fatigue.",
    warmupRule:
      "Prepare running mechanics, trunk stiffness, and station-specific movement patterns before the long work begins.",
    mainRule:
      "Use race-relevant distances and station tasks, with time caps only acting as pacing guardrails rather than the main prescription.",
    cooldownRule:
      "Walk breathing down and unload the tissues that were hit hardest by running, carries, and pushes.",
    progressionRule:
      "Progress by improving pace consistency, transition control, and station efficiency before simply adding more volume.",
    repCapSec: [45, 75],
    timeCapSec: [40, 60],
    holdCapSec: [30, 45],
    caloriesCapSec: [45, 75],
    distanceCapSec: [70, 160],
    stepsCapSec: [45, 75],
    restSec: [20, 35],
    cycles: 1,
  },
  "cardio-summit": {
    goal: "Build aerobic durability with longer sustainable intervals below red-line intensity.",
    warmupRule:
      "Raise temperature and groove movement economy before the longer aerobic climbs start.",
    mainRule:
      "Use sustained erg and locomotion intervals with controlled pacing rather than all-out efforts.",
    cooldownRule:
      "Let breathing fall progressively while lengthening the tissues used most in cyclical work.",
    progressionRule:
      "Progress by extending sustainable output and shortening unnecessary recovery, not by sprinting.",
    repCapSec: [35, 50],
    timeCapSec: [40, 65],
    holdCapSec: [30, 45],
    caloriesCapSec: [45, 75],
    distanceCapSec: [60, 90],
    stepsCapSec: [35, 55],
    restSec: [25, 40],
    cycles: 5,
  },
  "cardio-u": {
    goal: "Teach pacing and repeatability across mixed-intensity conditioning blocks.",
    warmupRule:
      "Use rhythm-focused prep work so members can find pace early instead of spiking the opening rounds.",
    mainRule:
      "Keep work bouts long enough to feel the pacing demand, but short enough to repeat with quality.",
    cooldownRule:
      "Bring breathing down and unload lower legs, hips, and trunk after repeated cyclical efforts.",
    progressionRule:
      "Progress by improving repeatability and recovery quality between efforts.",
    repCapSec: [35, 50],
    timeCapSec: [40, 60],
    holdCapSec: [30, 45],
    caloriesCapSec: [40, 65],
    distanceCapSec: [50, 80],
    stepsCapSec: [35, 55],
    restSec: [25, 40],
    cycles: 5,
  },
  "cardio-hiit": {
    goal: "Hit sharp, high-output intervals with clear recoveries and repeatable effort.",
    warmupRule:
      "Raise temperature and prepare the member to accelerate quickly without the first round becoming the warm-up.",
    mainRule:
      "Use short, hard work bouts with honest recovery so each interval can still be attacked.",
    cooldownRule:
      "Downshift breathing and lower-leg tension before finishing the session.",
    progressionRule:
      "Progress by adding interval pressure carefully, not by erasing recovery completely.",
    repCapSec: [25, 40],
    timeCapSec: [25, 45],
    holdCapSec: [20, 35],
    caloriesCapSec: [25, 45],
    distanceCapSec: [30, 55],
    stepsCapSec: [25, 40],
    restSec: [20, 35],
    cycles: 6,
  },
  crewfit: {
    goal: "Create a high-energy mixed conditioning feel with repeatable work rate.",
    warmupRule:
      "Use prep work that gets the member moving confidently before the tempo rises.",
    mainRule:
      "Blend erg and locomotion pieces that can be repeated with momentum and clean pacing.",
    cooldownRule:
      "Walk the energy down without turning the finish into dead space.",
    progressionRule:
      "Progress by improving total work rate and transition efficiency.",
    repCapSec: [30, 45],
    timeCapSec: [30, 50],
    holdCapSec: [25, 40],
    caloriesCapSec: [35, 55],
    distanceCapSec: [40, 65],
    stepsCapSec: [30, 45],
    restSec: [20, 35],
    cycles: 5,
  },
  xtx: {
    goal: "Bridge strength and conditioning through controlled complexes and aerobic pressure.",
    warmupRule:
      "Prepare both loaded patterns and breathing mechanics before hybrid blocks start.",
    mainRule:
      "Use resistance work that still needs quality, with enough conditioning pressure to challenge recovery between stations.",
    cooldownRule:
      "Bring breathing down first, then restore hips and trunk after mixed loading.",
    progressionRule:
      "Progress through denser hybrid work while preserving technical clarity in the resistance stations.",
    repCapSec: [40, 60],
    timeCapSec: [30, 50],
    holdCapSec: [30, 45],
    caloriesCapSec: [30, 50],
    distanceCapSec: [40, 65],
    stepsCapSec: [30, 45],
    restSec: [30, 45],
    cycles: 5,
  },
  "strength-endurance": {
    goal: "Hold onto strength qualities while fatigue and breathing demand rise.",
    warmupRule:
      "Prepare the main loaded patterns and build the trunk stiffness needed for repeat efforts.",
    mainRule:
      "Use moderate reps and repeatable sets that sit between pure strength and pure conditioning.",
    cooldownRule:
      "Unload the big movers and bring breathing down before leaving the session.",
    progressionRule:
      "Progress through a little more density or one more high-quality cycle while preserving force output.",
    repCapSec: [40, 60],
    timeCapSec: [30, 50],
    holdCapSec: [30, 45],
    caloriesCapSec: [35, 55],
    distanceCapSec: [40, 65],
    stepsCapSec: [30, 45],
    restSec: [35, 50],
    cycles: 5,
  },
  shred: {
    goal: "Keep the heart rate high through continuous mixed-modality work without losing movement control.",
    warmupRule:
      "Prepare breathing rhythm and simple movement patterns so the first round is productive immediately.",
    mainRule:
      "Use moderate resistance, repeatable erg output, and minimal idle time for high session density.",
    cooldownRule:
      "Ease the system down gradually after continuous work rather than stopping abruptly.",
    progressionRule:
      "Progress by trimming dead time and increasing repeat work, not by turning everything into a sprint.",
    repCapSec: [35, 55],
    timeCapSec: [30, 50],
    holdCapSec: [25, 40],
    caloriesCapSec: [30, 50],
    distanceCapSec: [35, 60],
    stepsCapSec: [30, 45],
    restSec: [20, 35],
    cycles: 5,
  },
  balanced: {
    goal: "Blend movement quality, stability, light conditioning, and broad physical coverage.",
    warmupRule:
      "Use control-led prep work that opens range of motion and teaches body position before loading or pace builds.",
    mainRule:
      "Use slower and cleaner station work with enough time to own positions rather than chase fatigue.",
    cooldownRule:
      "Use easy recovery work to settle joints, breathing, and posture before the member leaves.",
    progressionRule:
      "Progress by improving control, tolerance, and repeatability before adding much intensity.",
    repCapSec: [35, 55],
    timeCapSec: [30, 45],
    holdCapSec: [30, 45],
    caloriesCapSec: [35, 50],
    distanceCapSec: [40, 65],
    stepsCapSec: [30, 45],
    restSec: [30, 45],
    cycles: 5,
  },
};

export function inferPrescriptionType(
  targetLabel: string,
  unitHint?: string | null,
): ExercisePrescriptionType {
  const unit = unitHint?.toLowerCase();
  const target = targetLabel.toLowerCase();

  if (unit === "calories" || target.includes("calorie")) return "calories";
  if (unit === "metres" || target.includes("metre") || target.includes("lane length")) return "distance";
  if (unit === "steps" || target.includes("step")) return "steps";
  if (unit === "seconds" && target.includes("hold")) return "hold";
  if (target.includes("hold")) return "hold";
  if (unit === "seconds" || target.includes("pace") || target.includes("tempo") || target.includes("easy walk")) {
    return "time";
  }

  return "reps";
}

function parseNumeric(targetLabel: string) {
  const match = targetLabel.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function within([min, max]: [number, number], value: number) {
  return Math.max(min, Math.min(max, value));
}

function deriveMainWorkCapSec(
  programId: string,
  prescriptionType: ExercisePrescriptionType,
  targetLabel: string,
  exerciseName: string,
) {
  const framework = coachingFramework[programId as ProgramId] ?? coachingFramework.strength;
  const numeric = parseNumeric(targetLabel);
  const name = exerciseName.toLowerCase();

  if (prescriptionType === "hold") {
    return Math.round(within(framework.holdCapSec, numeric ?? framework.holdCapSec[1]));
  }

  if (prescriptionType === "time") {
    return Math.round(within(framework.timeCapSec, numeric ?? framework.timeCapSec[1]));
  }

  if (prescriptionType === "calories") {
    if (name.includes("bike") || name.includes("ski") || name.includes("row")) {
      return Math.round(within(framework.caloriesCapSec, (numeric ?? 12) * 3.6));
    }
    return Math.round(within(framework.caloriesCapSec, (numeric ?? 12) * 4));
  }

  if (prescriptionType === "distance") {
    if (name.includes("treadmill") || name.includes("run")) {
      return Math.round(within(framework.distanceCapSec, (numeric ?? 300) / 3.8));
    }
    if (name.includes("carry")) {
      return Math.round(within(framework.distanceCapSec, (numeric ?? 40) * 1.5));
    }
    return Math.round(within(framework.distanceCapSec, (numeric ?? 40) * 2));
  }

  if (prescriptionType === "steps") {
    return Math.round(within(framework.stepsCapSec, (numeric ?? 12) * 2.6));
  }

  if (name.includes("split squat") || name.includes("lunge")) {
    return Math.round(within(framework.repCapSec, (numeric ?? 10) * 5.2));
  }

  return Math.round(within(framework.repCapSec, (numeric ?? 10) * 4.4));
}

function deriveMainRestSec(
  programId: string,
  prescriptionType: ExercisePrescriptionType,
  exerciseName: string,
) {
  const framework = coachingFramework[programId as ProgramId] ?? coachingFramework.strength;
  const name = exerciseName.toLowerCase();

  if (programId === "hyrox") {
    return framework.restSec[0];
  }

  if (programId === "power" && (name.includes("jump") || name.includes("speed") || name.includes("snap"))) {
    return framework.restSec[1];
  }

  if (programId === "strength" && prescriptionType === "reps") {
    return framework.restSec[1];
  }

  if ((programId === "cardio-hiit" || programId === "shred") && prescriptionType !== "reps") {
    return framework.restSec[0];
  }

  return Math.round((framework.restSec[0] + framework.restSec[1]) / 2);
}

function deriveMainCycles(programId: string, exerciseName: string) {
  const framework = coachingFramework[programId as ProgramId] ?? coachingFramework.strength;
  const name = exerciseName.toLowerCase();

  if (programId === "power" && (name.includes("jump") || name.includes("speed") || name.includes("snap"))) {
    return framework.cycles + 1;
  }

  return framework.cycles;
}

function buildCoachingNote(
  programId: string,
  section: WorkoutSection,
  exerciseName: string,
  prescriptionType: ExercisePrescriptionType,
) {
  const framework = coachingFramework[programId as ProgramId] ?? coachingFramework.strength;

  if (section === "Warm-up") return framework.warmupRule;
  if (section === "Cool-down") return framework.cooldownRule;

  const modeLabel =
    prescriptionType === "reps"
      ? "rep quality"
      : prescriptionType === "hold"
        ? "position quality"
        : prescriptionType === "time"
          ? "steady timed effort"
          : prescriptionType === "calories"
            ? "output pacing"
            : prescriptionType === "distance"
              ? "distance pacing"
              : "rhythm and control";

  return `${framework.mainRule} ${exerciseName} is coached through ${modeLabel} rather than simply filling a generic timer.`;
}

export function getStarterExerciseDefaults(input: {
  programId: string;
  section: WorkoutSection;
  prescriptionType: ExercisePrescriptionType;
  targetLabel?: string;
  exerciseName?: string;
}) {
  const targetLabel = input.targetLabel ?? "";
  const exerciseName = input.exerciseName ?? "";

  if (input.section === "Warm-up") {
    return {
      durationSec: deriveWarmupCapSec(
        input.prescriptionType,
        targetLabel,
        exerciseName,
      ),
      restSec: 0,
      cycles: 1,
    };
  }

  if (input.section === "Cool-down") {
    return {
      durationSec: deriveCooldownCapSec(input.prescriptionType, targetLabel),
      restSec: 0,
      cycles: 1,
    };
  }

  return {
    durationSec: deriveMainWorkCapSec(
      input.programId,
      input.prescriptionType,
      targetLabel,
      exerciseName,
    ),
    restSec: deriveMainRestSec(input.programId, input.prescriptionType, exerciseName),
    cycles: deriveMainCycles(input.programId, exerciseName),
  };
}

export function normalizeWorkoutExercise(
  programId: string,
  section: WorkoutSection,
  exercise: WorkoutExercise,
): WorkoutExercise {
  const targetLabel = exercise.targets.base;
  const prescriptionType = inferPrescriptionType(targetLabel);
  const starterDefaults = getStarterExerciseDefaults({
    programId,
    section,
    prescriptionType,
    targetLabel,
    exerciseName: exercise.name,
  });

  if (section !== "Main session") {
    return {
      ...exercise,
      durationSec:
        exercise.durationSec === 50 || !exercise.durationSec
          ? starterDefaults.durationSec
          : Math.round(exercise.durationSec),
      restSec: starterDefaults.restSec,
      cycles: starterDefaults.cycles,
      prescriptionType,
      coachingNote: exercise.coachingNote ?? buildCoachingNote(programId, section, exercise.name, prescriptionType),
    };
  }

  const shouldReplaceDuration = !exercise.durationSec || exercise.durationSec === 170;
  const shouldReplaceRest = exercise.restSec === 30;
  const shouldReplaceCycles = !exercise.cycles || exercise.cycles === 3;

  return {
    ...exercise,
    durationSec: shouldReplaceDuration
      ? starterDefaults.durationSec
      : Math.round(exercise.durationSec),
    restSec: shouldReplaceRest
      ? starterDefaults.restSec
      : Math.round(exercise.restSec),
    cycles: shouldReplaceCycles
      ? starterDefaults.cycles
      : Math.max(1, Math.round(exercise.cycles ?? 1)),
    prescriptionType,
    coachingNote:
      exercise.coachingNote ?? buildCoachingNote(programId, section, exercise.name, prescriptionType),
  };
}

export function normalizeDailyWorkout<T extends { programId: string; warmup: WorkoutExercise[]; cooldown: WorkoutExercise[]; blocks: Array<{ exercises: WorkoutExercise[] }> }>(
  workout: T,
): T {
  const programId = workout.programId;

  return {
    ...workout,
    warmup: workout.warmup.map((exercise) => normalizeWorkoutExercise(programId, "Warm-up", exercise)),
    cooldown: workout.cooldown.map((exercise) =>
      normalizeWorkoutExercise(programId, "Cool-down", exercise),
    ),
    blocks: workout.blocks.map((block) => ({
      ...block,
      exercises: block.exercises.map((exercise) =>
        normalizeWorkoutExercise(programId, "Main session", exercise),
      ),
    })),
  };
}
