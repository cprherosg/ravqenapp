import {
  getProgramDefinition,
  getProgramForWeekday,
  getRotationSchedule,
  type ProgramId,
} from "@/lib/program-catalog";
import {
  getStarterExerciseDefaults,
  inferPrescriptionType,
  normalizeDailyWorkout,
} from "@/lib/coaching-framework";
import type { DailyWorkout, WeeklyScheduleEntry, WorkoutExercise } from "@/lib/types";

type ExerciseSeed = {
  name: string;
  equipment: string;
  demoSummary: string;
  mediaSrc: string;
  mediaAlt: string;
  targets: WorkoutExercise["targets"];
  cues: string[];
  durationSec?: number;
  restSec?: number;
  cycles?: number;
};

type ProgramSeed = {
  exercises: ExerciseSeed[];
  warmup?: WorkoutExercise[];
  cooldown?: WorkoutExercise[];
  feedback: DailyWorkout["feedback"];
};

type ProgramIntent = "resistance" | "conditioning" | "hybrid";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function createMainExercise(seed: ExerciseSeed, programId: ProgramId = "strength"): WorkoutExercise {
  const prescriptionType = inferPrescriptionType(seed.targets.base);
  const starterDefaults = getStarterExerciseDefaults({
    programId,
    section: "Main session",
    prescriptionType,
    targetLabel: seed.targets.base,
    exerciseName: seed.name,
  });

  return {
    ...seed,
    durationSec: seed.durationSec ?? starterDefaults.durationSec,
    restSec: seed.restSec ?? starterDefaults.restSec,
    cycles: seed.cycles ?? starterDefaults.cycles,
  };
}

function createPrepExercise(
  name: string,
  demoSummary: string,
  mediaSrc: string,
  mediaAlt: string,
  targets: WorkoutExercise["targets"],
  cues: string[],
  programId: ProgramId = "strength",
): WorkoutExercise {
  const starterDefaults = getStarterExerciseDefaults({
    programId,
    section: "Warm-up",
    prescriptionType: inferPrescriptionType(targets.base),
    targetLabel: targets.base,
    exerciseName: name,
  });

  return {
    name,
    durationSec: starterDefaults.durationSec,
    restSec: starterDefaults.restSec,
    equipment: "Open floor",
    demoSummary,
    mediaSrc,
    mediaAlt,
    targets,
    cues,
  };
}

function createEquipmentPrepExercise(
  name: string,
  equipment: string,
  demoSummary: string,
  mediaSrc: string,
  mediaAlt: string,
  targets: WorkoutExercise["targets"],
  cues: string[],
  programId: ProgramId = "strength",
): WorkoutExercise {
  const starterDefaults = getStarterExerciseDefaults({
    programId,
    section: "Warm-up",
    prescriptionType: inferPrescriptionType(targets.base),
    targetLabel: targets.base,
    exerciseName: name,
  });

  return {
    name,
    durationSec: starterDefaults.durationSec,
    restSec: starterDefaults.restSec,
    equipment,
    demoSummary,
    mediaSrc,
    mediaAlt,
    targets,
    cues,
  };
}

function getProgramIntent(programId: ProgramId): ProgramIntent {
  if (programId === "cardio-summit" || programId === "cardio-u" || programId === "cardio-hiit" || programId === "crewfit") {
    return "conditioning";
  }

  if (programId === "hyrox" || programId === "xtx" || programId === "strength-endurance" || programId === "shred" || programId === "balanced") {
    return "hybrid";
  }

  return "resistance";
}

function createWarmup(programId: ProgramId, category: string): WorkoutExercise[] {
  const intent = getProgramIntent(programId);

  if (intent === "conditioning") {
    return [
      createPrepExercise(
        "March and sweep",
        `Low-impact pulse raiser to prepare for ${category} intervals without any equipment.`,
        "/exercise-media/lunge-reach.svg",
        "March and sweep warm-up demo",
        { low: "easy pace", base: "steady pace", high: "brisk pace" },
        ["Stay upright", "Swing the arms naturally"],
        programId,
      ),
      createPrepExercise(
        "Bodyweight hinge",
        "Hip-dominant patterning to wake up hamstrings and glutes before cardio output.",
        "/exercise-media/kettlebell-hinge.svg",
        "Bodyweight hinge warm-up demo",
        { low: "8 reps", base: "10 reps", high: "12 reps" },
        ["Push hips back", "Keep ribs stacked"],
        programId,
      ),
      createPrepExercise(
        "Lateral step and reach",
        "Side-to-side movement to prep frontal-plane control and ankle stiffness.",
        "/exercise-media/lateral-band-walk.svg",
        "Lateral step and reach warm-up demo",
        { low: "8 steps", base: "12 steps", high: "16 steps" },
        ["Land softly", "Reach long through fingertips"],
        programId,
      ),
      createPrepExercise(
        "Split-stance rotation",
        "Open the hips and thoracic spine before repeat efforts.",
        "/exercise-media/lunge-reach.svg",
        "Split stance rotation warm-up demo",
        { low: "3 each side", base: "4 each side", high: "5 each side" },
        ["Brace through trunk", "Rotate from upper back"],
        programId,
      ),
      createPrepExercise(
        "Tall plank shoulder tap",
        "Prime core stiffness to support efficient running and rowing mechanics.",
        "/exercise-media/glute-bridge.svg",
        "Plank shoulder tap warm-up demo",
        { low: "6 taps", base: "10 taps", high: "14 taps" },
        ["Push the floor away", "Keep hips quiet"],
        programId,
      ),
      createPrepExercise(
        "Squat to calf raise",
        "Prepare knees and ankles for repeated accelerations and decelerations.",
        "/exercise-media/bodyweight-squat.svg",
        "Squat to calf raise warm-up demo",
        { low: "8 reps", base: "10 reps", high: "12 reps" },
        ["Sit between the heels", "Finish tall on the toes"],
        programId,
      ),
    ];
  }

  if (intent === "hybrid") {
    return [
      createPrepExercise(
        "Reach, hinge, and stand",
        `Whole-body prep to bridge strength and conditioning demands for ${category}.`,
        "/exercise-media/kettlebell-hinge.svg",
        "Reach hinge stand warm-up demo",
        { low: "8 reps", base: "10 reps", high: "12 reps" },
        ["Long spine", "Drive through feet on the stand"],
        programId,
      ),
      createPrepExercise(
        "Alternating reverse lunge",
        "Single-leg control and hip extension before loaded mixed-modality work.",
        "/exercise-media/lunge-reach.svg",
        "Alternating reverse lunge warm-up demo",
        { low: "6 total", base: "8 total", high: "10 total" },
        ["Step back softly", "Stay stacked"],
        programId,
      ),
      createPrepExercise(
        "World's greatest stretch",
        "Mobilize hips, groin, and thoracic spine to improve movement quality.",
        "/exercise-media/lunge-reach.svg",
        "Worlds greatest stretch warm-up demo",
        { low: "3 each side", base: "4 each side", high: "5 each side" },
        ["Keep back leg long", "Rotate smoothly"],
        programId,
      ),
      createPrepExercise(
        "Lateral squat shift",
        "Open adductors and ankles while rehearsing side-to-side loading.",
        "/exercise-media/lateral-band-walk.svg",
        "Lateral squat shift warm-up demo",
        { low: "6 each side", base: "8 each side", high: "10 each side" },
        ["Keep chest lifted", "Shift with control"],
        programId,
      ),
      createPrepExercise(
        "Glute bridge pulse",
        "Turn on posterior chain support before hybrid training blocks.",
        "/exercise-media/glute-bridge.svg",
        "Glute bridge pulse warm-up demo",
        { low: "10 reps", base: "14 reps", high: "18 reps" },
        ["Drive through heels", "Keep ribs down"],
        programId,
      ),
      createPrepExercise(
        "Bodyweight squat with reach",
        "Blend lower-body prep and breathing before the main session starts.",
        "/exercise-media/bodyweight-squat.svg",
        "Bodyweight squat with reach warm-up demo",
        { low: "8 reps", base: "10 reps", high: "12 reps" },
        ["Inhale down", "Reach long at the top"],
        programId,
      ),
    ];
  }

  return [
    createPrepExercise(
      "March and reach",
      `Raise body temperature and posture before ${category} resistance work.`,
      "/exercise-media/lunge-reach.svg",
      "March and reach warm-up demo",
      { low: "easy pace", base: "steady pace", high: "brisk pace" },
      ["Stand tall", "Reach overhead without shrugging"],
      programId,
    ),
    createPrepExercise(
      "Good morning hinge",
      "Groove hip hinge mechanics before loaded squats, hinges, and presses.",
      "/exercise-media/kettlebell-hinge.svg",
      "Good morning hinge warm-up demo",
      { low: "8 reps", base: "10 reps", high: "12 reps" },
      ["Push hips back", "Keep chest proud"],
      programId,
    ),
    createPrepExercise(
      "Walking lunge with reach",
      "Open the hips and trunk while rehearsing single-leg control.",
      "/exercise-media/lunge-reach.svg",
      "Walking lunge with reach warm-up demo",
      { low: "6 steps", base: "10 steps", high: "14 steps" },
      ["Soft rear-knee touch", "Reach through fingertips"],
      programId,
    ),
    createPrepExercise(
      "Lateral step and sit",
      "Prep frontal-plane control and glute med activation for stable lifting.",
      "/exercise-media/lateral-band-walk.svg",
      "Lateral step and sit warm-up demo",
      { low: "6 each side", base: "8 each side", high: "10 each side" },
      ["Sit into the hip", "Keep feet gripping the floor"],
      programId,
    ),
    createPrepExercise(
      "Bodyweight squat",
      "Pattern a full-depth squat with controlled tempo before loading.",
      "/exercise-media/bodyweight-squat.svg",
      "Bodyweight squat warm-up demo",
      { low: "8 reps", base: "10 reps", high: "12 reps" },
      ["Brace before each rep", "Knees track over toes"],
      programId,
    ),
    createPrepExercise(
      "Alternating knee hug",
      "Open hips and challenge balance before unilateral resistance work.",
      "/exercise-media/lunge-reach.svg",
      "Alternating knee hug warm-up demo",
      { low: "6 each side", base: "8 each side", high: "10 each side" },
      ["Grow tall through the spine", "Pause each rep briefly"],
      programId,
    ),
  ];
}

function createCooldown(programId: ProgramId, category: string): WorkoutExercise[] {
  const intent = getProgramIntent(programId);

  if (intent === "conditioning") {
    return [
      createPrepExercise(
        "Walking breath-down",
        `Gradually lower heart rate after ${category} with relaxed nasal breathing.`,
        "/exercise-media/treadmill-walk.svg",
        "Walking breath down cooldown demo",
        { low: "easy walk", base: "easy walk", high: "easy walk" },
        ["Slow the exhale", "Drop the shoulders"],
        programId,
      ),
      createPrepExercise(
        "Standing quad stretch",
        "Restore front-of-thigh length after repeated locomotion and erg work.",
        "/exercise-media/split-squat.svg",
        "Standing quad stretch cooldown demo",
        { low: "hold and breathe", base: "hold and breathe", high: "hold and breathe" },
        ["Knees close together", "Stay tall"],
        programId,
      ),
      createPrepExercise(
        "Calf wall lean",
        "Ease lower-leg tension built up during repeated intervals.",
        "/exercise-media/lunge-reach.svg",
        "Calf wall lean cooldown demo",
        { low: "easy hold", base: "easy hold", high: "easy hold" },
        ["Press heel long", "Exhale slowly"],
        programId,
      ),
      createPrepExercise(
        "Forward fold",
        "Release the posterior chain and encourage relaxed breathing.",
        "/exercise-media/kettlebell-hinge.svg",
        "Forward fold cooldown demo",
        { low: "easy hold", base: "easy hold", high: "easy hold" },
        ["Unlock knees", "Relax the jaw"],
        programId,
      ),
      createPrepExercise(
        "Open-book reach",
        "Restore thoracic rotation after repetitive forward-facing efforts.",
        "/exercise-media/lunge-reach.svg",
        "Open book reach cooldown demo",
        { low: "3 each side", base: "4 each side", high: "5 each side" },
        ["Move slowly", "Exhale into the rotation"],
        programId,
      ),
      createPrepExercise(
        "Standing breathing reset",
        "Finish the session with slow cadence breathing and recovery focus.",
        "/exercise-media/bodyweight-squat.svg",
        "Standing breathing reset cooldown demo",
        { low: "4-in 6-out", base: "4-in 6-out", high: "4-in 6-out" },
        ["Inhale through nose", "Let heart rate settle"],
        programId,
      ),
    ];
  }

  if (intent === "hybrid") {
    return [
      createPrepExercise(
        "Hip flexor stretch",
        `Open the front of the hips after ${category} hybrid loading.`,
        "/exercise-media/lunge-reach.svg",
        "Hip flexor stretch cooldown demo",
        { low: "easy hold", base: "easy hold", high: "easy hold" },
        ["Tuck pelvis lightly", "Breathe into the stretch"],
        programId,
      ),
      createPrepExercise(
        "Figure-four glute stretch",
        "Reduce hip tension after mixed squatting, hinging, and conditioning.",
        "/exercise-media/glute-bridge.svg",
        "Figure four cooldown demo",
        { low: "easy hold", base: "easy hold", high: "easy hold" },
        ["Keep shoulders relaxed", "Exhale long"],
        programId,
      ),
      createPrepExercise(
        "Hamstring reach",
        "Restore hinge range after repeat strength-endurance work.",
        "/exercise-media/kettlebell-hinge.svg",
        "Hamstring reach cooldown demo",
        { low: "easy hold", base: "easy hold", high: "easy hold" },
        ["Soft knees", "Lengthen through crown of head"],
        programId,
      ),
      createPrepExercise(
        "Thoracic rotation",
        "Unwind the upper back after loaded complexes and erg efforts.",
        "/exercise-media/lunge-reach.svg",
        "Thoracic rotation cooldown demo",
        { low: "3 each side", base: "4 each side", high: "5 each side" },
        ["Move smoothly", "Keep hips quiet"],
        programId,
      ),
      createPrepExercise(
        "Child's pose reset",
        "Settle breathing and spinal tension before leaving the session.",
        "/exercise-media/glute-bridge.svg",
        "Childs pose cooldown demo",
        { low: "slow breathing", base: "slow breathing", high: "slow breathing" },
        ["Expand ribs with inhale", "Relax the shoulders"],
        programId,
      ),
      createPrepExercise(
        "Standing breathing reset",
        "Finish with calm recovery breathing to close the session.",
        "/exercise-media/bodyweight-squat.svg",
        "Standing breathing cooldown demo",
        { low: "4-in 6-out", base: "4-in 6-out", high: "4-in 6-out" },
        ["Stay soft in the knees", "Exhale fully"],
        programId,
      ),
    ];
  }

  return [
    createPrepExercise(
      "Standing forward fold",
      `Reduce lower-body tone after ${category} resistance work.`,
      "/exercise-media/kettlebell-hinge.svg",
      "Standing forward fold cooldown demo",
      { low: "easy hold", base: "easy hold", high: "easy hold" },
      ["Unlock knees", "Let neck relax"],
      programId,
    ),
    createPrepExercise(
      "Quad stretch",
      "Restore front-of-thigh length after loaded lower-body training.",
      "/exercise-media/split-squat.svg",
      "Quad stretch cooldown demo",
      { low: "easy hold", base: "easy hold", high: "easy hold" },
      ["Squeeze glute gently", "Stand tall"],
      programId,
    ),
    createPrepExercise(
      "Hip flexor reach",
      "Open the hips and trunk after squats, lunges, and carries.",
      "/exercise-media/lunge-reach.svg",
      "Hip flexor reach cooldown demo",
      { low: "easy hold", base: "easy hold", high: "easy hold" },
      ["Tailbone gently tucked", "Reach overhead"],
      programId,
    ),
    createPrepExercise(
      "Figure-four sit",
      "Ease glute and piriformis tension after unilateral work.",
      "/exercise-media/glute-bridge.svg",
      "Figure four sit cooldown demo",
      { low: "easy hold", base: "easy hold", high: "easy hold" },
      ["Sit back softly", "Keep chest open"],
      programId,
    ),
    createPrepExercise(
      "Open-book reach",
      "Restore thoracic rotation after bracing and front-rack loading.",
      "/exercise-media/lunge-reach.svg",
      "Open book reach cooldown demo",
      { low: "3 each side", base: "4 each side", high: "5 each side" },
      ["Rotate through upper back", "Breathe out as you open"],
      programId,
    ),
    createPrepExercise(
      "Standing breathing reset",
      "Downshift the nervous system before ending the session.",
      "/exercise-media/bodyweight-squat.svg",
      "Standing breathing reset cooldown demo",
      { low: "4-in 6-out", base: "4-in 6-out", high: "4-in 6-out" },
      ["Relax the jaw", "Keep shoulders heavy"],
      programId,
    ),
  ];
}

const programSeeds: Record<ProgramId, ProgramSeed> = {
  complimentary: {
    warmup: [
      createEquipmentPrepExercise(
        "Seated calf raise machine",
        "Calf raise machine",
        "Light ankle and calf prep to raise temperature before the main lifts.",
        "/exercise-media/complimentary/seated-calf-raise-machine.mp4",
        "Seated calf raise machine demo",
        { low: "easy tempo", base: "steady tempo", high: "brisk tempo" },
        ["Move through full ankle range", "Keep the first set light"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Side lateral raise with dumbbells",
        "Light dumbbells",
        "Low-load shoulder prep to wake up the upper body before pressing and pulling.",
        "/exercise-media/complimentary/side-lateral-raise-with-dumbbells.mp4",
        "Side lateral raise with dumbbells demo",
        { low: "10 reps", base: "12 reps", high: "14 reps" },
        ["Keep shoulders down", "Lift with control"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Cable rope face pull",
        "Cable + rope",
        "Scapular activation to prime upper-back control before rows and pulldowns.",
        "/exercise-media/complimentary/cable-rope-face-pull.mp4",
        "Cable rope face pull demo",
        { low: "10 reps", base: "12 reps", high: "14 reps" },
        ["Pull toward eye line", "Keep elbows high"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Plank",
        "Open floor",
        "Simple trunk-bracing prep before loaded machine and dumbbell work.",
        "/exercise-media/complimentary/plank.mp4",
        "Plank demo",
        { low: "20 seconds", base: "30 seconds", high: "40 seconds" },
        ["Brace through the ribs", "Keep hips level"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Dumbbell lunges",
        "Light dumbbells",
        "Single-leg patterning to prepare hips and knees for the main lower-body stations.",
        "/exercise-media/complimentary/dumbbell-lunges.mp4",
        "Dumbbell lunges demo",
        { low: "6 total", base: "8 total", high: "10 total" },
        ["Stay tall", "Step smoothly into each rep"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Seated cable row neutral grip",
        "Cable row machine",
        "Light row pattern to groove posture and upper-back engagement before the main set.",
        "/exercise-media/complimentary/seated-cable-row-neutral-grip.mp4",
        "Seated cable row neutral grip demo",
        { low: "10 reps", base: "12 reps", high: "14 reps" },
        ["Chest lifted", "Pause briefly at the body"],
        "complimentary",
      ),
    ],
    exercises: [
      {
        name: "Leg press",
        equipment: "Leg press machine",
        demoSummary:
          "Stable lower-body press that gives complimentary members a confident leg-strength anchor without technical barbell setup.",
        mediaSrc: "/exercise-media/complimentary/leg-press.mp4",
        mediaAlt: "Leg press demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Lower with control", "Drive evenly through both feet"],
        durationSec: 60,
        restSec: 40,
        cycles: 6,
      },
      {
        name: "Incline dumbbell press",
        equipment: "Bench + dumbbells",
        demoSummary:
          "Upper-body push station that is approachable, stable, and easy to progress over time.",
        mediaSrc: "/exercise-media/complimentary/incline-dumbbell-press.mp4",
        mediaAlt: "Incline dumbbell press demo",
        targets: { low: "8 reps", base: "10 reps", high: "12 reps" },
        cues: ["Set shoulders first", "Press through a smooth arc"],
        durationSec: 60,
        restSec: 40,
        cycles: 6,
      },
      {
        name: "Seated cable row neutral grip",
        equipment: "Cable row machine",
        demoSummary:
          "Controlled pulling pattern to balance pressing volume and build postural strength.",
        mediaSrc: "/exercise-media/complimentary/seated-cable-row-neutral-grip.mp4",
        mediaAlt: "Seated cable row neutral grip demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Lead with elbows", "Return slowly"],
        durationSec: 60,
        restSec: 40,
        cycles: 6,
      },
      {
        name: "Romanian deadlift",
        equipment: "Barbell or dumbbells",
        demoSummary:
          "Hip-dominant hinge station to train hamstrings and glutes with a simple, repeatable setup.",
        mediaSrc: "/exercise-media/complimentary/romanian-deadlift.mp4",
        mediaAlt: "Romanian deadlift demo",
        targets: { low: "8 reps", base: "10 reps", high: "12 reps" },
        cues: ["Push hips back", "Keep the weight close to the body"],
        durationSec: 60,
        restSec: 40,
        cycles: 6,
      },
      {
        name: "Lat pulldown",
        equipment: "Lat pulldown machine",
        demoSummary:
          "Supported vertical pulling pattern that develops upper-body strength without needing bodyweight pull-up skill.",
        mediaSrc: "/exercise-media/complimentary/lat-pulldown.mp4",
        mediaAlt: "Lat pulldown demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Pull to upper chest", "Keep ribs stacked"],
        durationSec: 60,
        restSec: 40,
        cycles: 6,
      },
    ],
    cooldown: [
      createEquipmentPrepExercise(
        "Cable rope face pull",
        "Cable + rope",
        "Use a lighter tempo to restore upper-back position and shoulder comfort at the end of the session.",
        "/exercise-media/complimentary/cable-rope-face-pull.mp4",
        "Cable rope face pull demo",
        { low: "easy tempo", base: "easy tempo", high: "easy tempo" },
        ["Use less load", "Let breathing slow down"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Seated cable row neutral grip",
        "Cable row machine",
        "Light row flush to bring breathing down and finish with smooth posture.",
        "/exercise-media/complimentary/seated-cable-row-neutral-grip.mp4",
        "Seated cable row neutral grip demo",
        { low: "easy tempo", base: "easy tempo", high: "easy tempo" },
        ["Sit tall", "Move slowly"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Seated calf raise machine",
        "Calf raise machine",
        "Lower-intensity ankle work to ease lower-leg tension after presses and lunges.",
        "/exercise-media/complimentary/seated-calf-raise-machine.mp4",
        "Seated calf raise machine demo",
        { low: "easy tempo", base: "easy tempo", high: "easy tempo" },
        ["Short range is fine", "Stay relaxed through the upper body"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Side lateral raise with dumbbells",
        "Light dumbbells",
        "Very light shoulder work to finish with posture and controlled breathing.",
        "/exercise-media/complimentary/side-lateral-raise-with-dumbbells.mp4",
        "Side lateral raise with dumbbells demo",
        { low: "8 reps", base: "10 reps", high: "12 reps" },
        ["Use very light load", "Lower slower than you lift"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Dumbbell bicep curl standing",
        "Light dumbbells",
        "Easy upper-body flush to bring effort down without introducing a new movement pattern.",
        "/exercise-media/complimentary/dumbbell-bicep-curl-standing.mp4",
        "Dumbbell bicep curl standing demo",
        { low: "8 reps", base: "10 reps", high: "12 reps" },
        ["Keep elbows still", "Relax the grip"],
        "complimentary",
      ),
      createEquipmentPrepExercise(
        "Plank",
        "Open floor",
        "Finish with calm trunk control and slower breathing before ending the session.",
        "/exercise-media/complimentary/plank.mp4",
        "Plank demo",
        { low: "20 seconds", base: "25 seconds", high: "30 seconds" },
        ["Breathe behind the brace", "Stay long through the spine"],
        "complimentary",
      ),
    ],
    feedback: {
      rpePrompt: "How manageable but productive did this Complimentary session feel (1-10)?",
      loadPrompt: "Log the main machine or dumbbell loads you used in kg",
    },
  },
  strength: {
    exercises: [
      {
        name: "Barbell back squat",
        equipment: "Rack + barbell",
        demoSummary: "Primary force-focused lift with crisp bracing and controlled depth.",
        mediaSrc: "/exercise-media/barbell-back-squat.svg",
        mediaAlt: "Barbell back squat demo",
        targets: {
          low: "5 reps at moderate load",
          base: "6 reps at working load",
          high: "7 reps at challenging load",
        },
        cues: ["Brace before unrack", "Drive through full foot"],
        durationSec: 55,
        restSec: 65,
        cycles: 5,
      },
      {
        name: "Dumbbell Romanian deadlift",
        equipment: "Dumbbells",
        demoSummary: "Posterior-chain loading to pair hinge strength with the squat pattern.",
        mediaSrc: "/exercise-media/dumbbell-rdl.svg",
        mediaAlt: "Dumbbell Romanian deadlift demo",
        targets: { low: "8 reps", base: "10 reps", high: "12 reps" },
        cues: ["Keep bells close", "Stop before lumbar flexion"],
        durationSec: 60,
        restSec: 60,
        cycles: 5,
      },
      {
        name: "Rear-foot elevated split squat",
        equipment: "Bench + dumbbells",
        demoSummary: "Single-leg strength builder for pelvis control and force balance.",
        mediaSrc: "/exercise-media/split-squat.svg",
        mediaAlt: "Rear foot elevated split squat demo",
        targets: {
          low: "6 reps per leg",
          base: "8 reps per leg",
          high: "10 reps per leg",
        },
        cues: ["Front foot planted", "Stay stacked over hips"],
        durationSec: 60,
        restSec: 60,
        cycles: 5,
      },
      {
        name: "Walking sled push",
        equipment: "Sled",
        demoSummary: "Heavy locomotive effort that reinforces leg drive without extra impact.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Walking sled push demo",
        targets: {
          low: "1 lane length",
          base: "2 lane lengths",
          high: "3 lane lengths",
        },
        cues: ["45-degree body lean", "Short powerful steps"],
        durationSec: 50,
        restSec: 70,
        cycles: 5,
      },
      {
        name: "Glute bridge hold",
        equipment: "Open floor",
        demoSummary: "Low-skill accessory to finish with posterior-chain tension and control.",
        mediaSrc: "/exercise-media/glute-bridge.svg",
        mediaAlt: "Glute bridge hold demo",
        targets: { low: "30-second hold", base: "40-second hold", high: "50-second hold" },
        cues: ["Ribs down", "Squeeze glutes evenly"],
        durationSec: 50,
        restSec: 70,
        cycles: 5,
      },
    ],
    feedback: {
      rpePrompt: "Rate the full strength session from 1-10",
      loadPrompt: "Log your top squat and RDL loads in kg",
    },
  },
  pump: {
    exercises: [
      {
        name: "Bodyweight squat pulse",
        equipment: "Open floor",
        demoSummary: "High-density squat pattern to increase local muscular fatigue.",
        mediaSrc: "/exercise-media/bodyweight-squat.svg",
        mediaAlt: "Squat pulse demo",
        targets: { low: "16 reps", base: "22 reps", high: "28 reps" },
        cues: ["Keep tension throughout", "Do not bounce off the bottom"],
      },
      {
        name: "Dumbbell Romanian deadlift",
        equipment: "Dumbbells",
        demoSummary: "Moderate-load hinge work to accumulate hypertrophy-friendly volume.",
        mediaSrc: "/exercise-media/dumbbell-rdl.svg",
        mediaAlt: "Dumbbell Romanian deadlift demo",
        targets: { low: "12 reps", base: "14 reps", high: "16 reps" },
        cues: ["Long hamstrings", "Smooth cadence"],
      },
      {
        name: "Rear-foot elevated split squat",
        equipment: "Bench + dumbbells",
        demoSummary: "Unilateral leg volume with sustained time under tension.",
        mediaSrc: "/exercise-media/split-squat.svg",
        mediaAlt: "Split squat pump demo",
        targets: {
          low: "10 reps per leg",
          base: "12 reps per leg",
          high: "14 reps per leg",
        },
        cues: ["Stay vertical", "Avoid rushing the descent"],
      },
      {
        name: "Glute bridge pulse",
        equipment: "Open floor",
        demoSummary: "Local glute volume without introducing a new setup or station.",
        mediaSrc: "/exercise-media/glute-bridge.svg",
        mediaAlt: "Glute bridge pulse demo",
        targets: { low: "18 reps", base: "24 reps", high: "30 reps" },
        cues: ["Keep heels planted", "Finish each rep fully"],
      },
      {
        name: "Lateral step squat",
        equipment: "Open floor",
        demoSummary: "Add frontal-plane loading to round out lower-body pump work.",
        mediaSrc: "/exercise-media/lateral-band-walk.svg",
        mediaAlt: "Lateral step squat demo",
        targets: { low: "10 steps", base: "14 steps", high: "18 steps" },
        cues: ["Stay low through the steps", "Push knees out gently"],
      },
    ],
    feedback: {
      rpePrompt: "How much local muscular burn did this Pump session create (1-10)?",
      loadPrompt: "Log the dumbbell load used most often in kg",
    },
  },
  hyper: {
    exercises: [
      {
        name: "Rear-foot elevated split squat",
        equipment: "Bench + dumbbells",
        demoSummary: "Unilateral hypertrophy anchor with a long range of motion.",
        mediaSrc: "/exercise-media/split-squat.svg",
        mediaAlt: "Split squat hyper demo",
        targets: {
          low: "8 reps per leg",
          base: "10 reps per leg",
          high: "12 reps per leg",
        },
        cues: ["Slow the lowering phase", "Drive straight up"],
      },
      {
        name: "Dumbbell Romanian deadlift",
        equipment: "Dumbbells",
        demoSummary: "Hamstring and glute loading using moderate repetitions and control.",
        mediaSrc: "/exercise-media/dumbbell-rdl.svg",
        mediaAlt: "Romanian deadlift hyper demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Own the bottom position", "Keep grip relaxed"],
      },
      {
        name: "Barbell back squat",
        equipment: "Rack + barbell",
        demoSummary: "Moderate-load squat work to build total lower-body tissue exposure.",
        mediaSrc: "/exercise-media/barbell-back-squat.svg",
        mediaAlt: "Barbell squat hyper demo",
        targets: { low: "6 reps", base: "8 reps", high: "10 reps" },
        cues: ["Stay braced", "Control the eccentric"],
      },
      {
        name: "Glute bridge hold",
        equipment: "Open floor",
        demoSummary: "Accessory tension work to extend glute time under tension safely.",
        mediaSrc: "/exercise-media/glute-bridge.svg",
        mediaAlt: "Glute bridge hold hyper demo",
        targets: { low: "30-second hold", base: "40-second hold", high: "50-second hold" },
        cues: ["Keep hips level", "Drive through heels"],
      },
      {
        name: "Lateral band-walk pattern",
        equipment: "Open floor",
        demoSummary: "Lateral hip work to support knee tracking and pelvic control.",
        mediaSrc: "/exercise-media/lateral-band-walk.svg",
        mediaAlt: "Lateral band walk pattern demo",
        targets: { low: "10 steps", base: "14 steps", high: "18 steps" },
        cues: ["Stay low", "Keep toes facing forward"],
      },
    ],
    feedback: {
      rpePrompt: "How challenging was the hypertrophy stimulus overall (1-10)?",
      loadPrompt: "Log the working loads used for squat and split squat in kg",
    },
  },
  hirt: {
    exercises: [
      {
        name: "Barbell back squat",
        equipment: "Rack + barbell",
        demoSummary: "Resistance-first effort performed under tighter work-rest pressure.",
        mediaSrc: "/exercise-media/barbell-back-squat.svg",
        mediaAlt: "Barbell squat HIRT demo",
        targets: { low: "6 reps", base: "8 reps", high: "10 reps" },
        cues: ["Stay crisp under fatigue", "Reset breath before each set"],
      },
      {
        name: "Assault bike surge",
        equipment: "Assault bike",
        demoSummary: "Short conditioning burst to elevate oxygen demand between loaded sets.",
        mediaSrc: "/exercise-media/assault-bike.svg",
        mediaAlt: "Assault bike surge demo",
        targets: { low: "8 calories", base: "12 calories", high: "16 calories" },
        cues: ["Push and pull evenly", "Build into the final 20 seconds"],
      },
      {
        name: "Dumbbell Romanian deadlift",
        equipment: "Dumbbells",
        demoSummary: "Hinge volume with stable trunk mechanics under repeat pressure.",
        mediaSrc: "/exercise-media/dumbbell-rdl.svg",
        mediaAlt: "Dumbbell RDL HIRT demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Hips back", "Shoulders packed"],
      },
      {
        name: "Walking sled push",
        equipment: "Sled",
        demoSummary: "Locomotor conditioning without losing the resistance-training feel.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Sled push HIRT demo",
        targets: {
          low: "1 lane length",
          base: "2 lane lengths",
          high: "3 lane lengths",
        },
        cues: ["Drive knees through", "Maintain body angle"],
      },
      {
        name: "Rear-foot elevated split squat",
        equipment: "Bench + dumbbells",
        demoSummary: "Finish with unilateral strength endurance while fatigue is elevated.",
        mediaSrc: "/exercise-media/split-squat.svg",
        mediaAlt: "Split squat HIRT demo",
        targets: {
          low: "8 reps per leg",
          base: "10 reps per leg",
          high: "12 reps per leg",
        },
        cues: ["Stay smooth", "Avoid twisting through the torso"],
      },
    ],
    feedback: {
      rpePrompt: "How hard did the H.I.R.T session feel on your lungs and legs (1-10)?",
      loadPrompt: "Log your squat load and best bike calories",
    },
  },
  power: {
    exercises: [
      {
        name: "Barbell speed squat",
        equipment: "Rack + barbell",
        demoSummary: "Explosive squat sets emphasizing intent and bar speed over grind.",
        mediaSrc: "/exercise-media/barbell-back-squat.svg",
        mediaAlt: "Barbell speed squat demo",
        targets: { low: "4 fast reps", base: "5 fast reps", high: "6 fast reps" },
        cues: ["Move with intent", "Stop before speed drops"],
      },
      {
        name: "Walking sled push",
        equipment: "Sled",
        demoSummary: "Fast force production through the legs with a simple setup.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Walking sled push power demo",
        targets: {
          low: "1 lane length",
          base: "2 lane lengths",
          high: "3 lane lengths",
        },
        cues: ["Accelerate early", "Keep steps quick"],
      },
      {
        name: "Kettlebell hinge snap",
        equipment: "Kettlebell",
        demoSummary: "Ballistic hip extension pattern to build explosive posterior-chain output.",
        mediaSrc: "/exercise-media/kettlebell-hinge.svg",
        mediaAlt: "Kettlebell hinge snap demo",
        targets: { low: "10 reps", base: "14 reps", high: "18 reps" },
        cues: ["Snap the hips", "Let arms stay loose"],
      },
      {
        name: "Ski erg drive",
        equipment: "Ski erg",
        demoSummary: "Powerful whole-body conditioning burst with clear output feedback.",
        mediaSrc: "/exercise-media/ski-erg.svg",
        mediaAlt: "Ski erg drive demo",
        targets: { low: "8 calories", base: "12 calories", high: "16 calories" },
        cues: ["Hinge then drive", "Finish each pull"],
      },
      {
        name: "Squat jump pattern",
        equipment: "Open floor",
        demoSummary: "Low-volume bodyweight power finisher with full landing control.",
        mediaSrc: "/exercise-media/bodyweight-squat.svg",
        mediaAlt: "Squat jump pattern demo",
        targets: { low: "5 reps", base: "6 reps", high: "8 reps" },
        cues: ["Land softly", "Reset before each jump"],
      },
    ],
    feedback: {
      rpePrompt: "How explosive did you feel today (1-10)?",
      loadPrompt: "Log the barbell load and best ski-erg calories",
    },
  },
  hyrox: {
    exercises: [
      {
        name: "Treadmill run",
        equipment: "Treadmill",
        demoSummary:
          "Steady race-prep running block to rehearse repeatable pace before moving onto the next station.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill running demo",
        targets: { low: "400 metres", base: "600 metres", high: "800 metres" },
        cues: ["Run tall", "Keep the first minute controlled", "Settle into race rhythm"],
        durationSec: 170,
        restSec: 20,
        cycles: 1,
      },
      {
        name: "SkiErg",
        equipment: "SkiErg",
        demoSummary:
          "Full-body pull station that trains trunk stiffness and sustainable power after the run.",
        mediaSrc: "/exercise-media/ski-erg.svg",
        mediaAlt: "SkiErg demo",
        targets: { low: "200 metres", base: "300 metres", high: "400 metres" },
        cues: ["Hinge then punch down", "Drive through lats and trunk", "Keep strokes smooth"],
        durationSec: 160,
        restSec: 25,
        cycles: 1,
      },
      {
        name: "Treadmill run",
        equipment: "Treadmill",
        demoSummary:
          "Return to running quickly after the SkiErg to build compromised-run pacing and calm breathing control.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill running demo",
        targets: { low: "400 metres", base: "600 metres", high: "800 metres" },
        cues: ["Reset your cadence fast", "Relax the shoulders", "Hold a repeatable pace"],
        durationSec: 170,
        restSec: 20,
        cycles: 1,
      },
      {
        name: "Sled push",
        equipment: "Sled",
        demoSummary:
          "Heavy forward drive to build leg force and preserve posture under fatigue, a key Hyrox demand.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Sled push demo",
        targets: { low: "2 lane lengths", base: "3 lane lengths", high: "4 lane lengths" },
        cues: ["Lean into the sled", "Short fast steps", "Keep pressure through the handles"],
        durationSec: 160,
        restSec: 30,
        cycles: 1,
      },
      {
        name: "Treadmill run",
        equipment: "Treadmill",
        demoSummary:
          "Ease back into strong forward running after the heavy sled push without spiking too hard early.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill running demo",
        targets: { low: "400 metres", base: "600 metres", high: "800 metres" },
        cues: ["Quick feet", "Get tall again", "Control the first 20 seconds"],
        durationSec: 170,
        restSec: 20,
        cycles: 1,
      },
      {
        name: "Sled pull",
        equipment: "Sled + rope",
        demoSummary:
          "Backward-driving sled work to build grip, trunk control, and posterior-chain endurance after locomotion.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Sled pull demo",
        targets: { low: "2 rope pulls", base: "3 rope pulls", high: "4 rope pulls" },
        cues: ["Sit back into the pull", "Hand-over-hand rhythm", "Stay braced while stepping back"],
        durationSec: 155,
        restSec: 25,
        cycles: 1,
      },
      {
        name: "Treadmill run",
        equipment: "Treadmill",
        demoSummary:
          "Run again while the upper back and grip are taxed, building the rhythm changes needed in Hyrox prep.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill running demo",
        targets: { low: "400 metres", base: "600 metres", high: "800 metres" },
        cues: ["Settle breathing fast", "Keep your eyes forward", "Run within yourself"],
        durationSec: 170,
        restSec: 20,
        cycles: 1,
      },
      {
        name: "Burpee broad jump",
        equipment: "Open floor",
        demoSummary:
          "Ground-to-travel station that teaches efficient transitions and repeat efforts while the heart rate stays high.",
        mediaSrc: "/exercise-media/bodyweight-squat.svg",
        mediaAlt: "Burpee broad jump demo",
        targets: { low: "6 reps", base: "10 reps", high: "14 reps" },
        cues: ["Land soft", "Stay compact through the burpee", "Jump only as far as you can repeat well"],
        durationSec: 145,
        restSec: 25,
        cycles: 1,
      },
      {
        name: "Treadmill run",
        equipment: "Treadmill",
        demoSummary:
          "Practice returning to smooth running after floor-based explosive work and repeated get-ups.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill running demo",
        targets: { low: "400 metres", base: "600 metres", high: "800 metres" },
        cues: ["Shorten the stride first", "Let the pace build naturally", "Stay calm through the trunk"],
        durationSec: 170,
        restSec: 20,
        cycles: 1,
      },
      {
        name: "Rowing",
        equipment: "Rower",
        demoSummary:
          "Sustained row to train leg drive and breathing control before returning to loaded carries and lunges.",
        mediaSrc: "/exercise-media/bike-erg.svg",
        mediaAlt: "Rowing demo",
        targets: { low: "250 metres", base: "400 metres", high: "550 metres" },
        cues: ["Push with the legs first", "Relax the recovery", "Hold a pace you can finish strongly"],
        durationSec: 160,
        restSec: 25,
        cycles: 1,
      },
      {
        name: "Treadmill run",
        equipment: "Treadmill",
        demoSummary:
          "Run off the rower while the legs are loaded and breathing is elevated, but keep the pace sustainable.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill running demo",
        targets: { low: "400 metres", base: "600 metres", high: "800 metres" },
        cues: ["Stand tall out of the row", "Find rhythm quickly", "Hold your form late"],
        durationSec: 170,
        restSec: 20,
        cycles: 1,
      },
      {
        name: "Farmers carry",
        equipment: "Heavy dumbbells or kettlebells",
        demoSummary:
          "Loaded carry to challenge grip, trunk stiffness, and walking efficiency under fatigue.",
        mediaSrc: "/exercise-media/lunge-reach.svg",
        mediaAlt: "Farmers carry demo",
        targets: { low: "40 metres", base: "80 metres", high: "120 metres" },
        cues: ["Walk tall", "Small fast steps", "Do not let the shoulders round forward"],
        durationSec: 145,
        restSec: 20,
        cycles: 1,
      },
      {
        name: "Treadmill run",
        equipment: "Treadmill",
        demoSummary:
          "Another compromised run block after grip-intensive work, focusing on posture and cadence.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill running demo",
        targets: { low: "400 metres", base: "600 metres", high: "800 metres" },
        cues: ["Relax your hands", "Run tall", "Keep the cadence snappy"],
        durationSec: 170,
        restSec: 20,
        cycles: 1,
      },
      {
        name: "Sandbag lunge",
        equipment: "Sandbag",
        demoSummary:
          "Front-loaded lunge pattern to rehearse unilateral control once the legs are already fatigued.",
        mediaSrc: "/exercise-media/lunge-reach.svg",
        mediaAlt: "Sandbag lunge demo",
        targets: { low: "12 total", base: "20 total", high: "28 total" },
        cues: ["Stay tall through the torso", "Touch knee softly", "Keep the front foot rooted"],
        durationSec: 150,
        restSec: 25,
        cycles: 1,
      },
      {
        name: "Treadmill run",
        equipment: "Treadmill",
        demoSummary:
          "Penultimate run block to rehearse staying composed before the final high-rep wall-ball finish.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill running demo",
        targets: { low: "400 metres", base: "600 metres", high: "800 metres" },
        cues: ["Stay composed", "Relax your jaw", "Leave enough to finish strong"],
        durationSec: 170,
        restSec: 25,
        cycles: 1,
      },
      {
        name: "Wall balls",
        equipment: "Wall ball + target",
        demoSummary:
          "Final high-rep squat-and-throw station that tests leg endurance and breathing control late in the session.",
        mediaSrc: "/exercise-media/bodyweight-squat.svg",
        mediaAlt: "Wall ball demo",
        targets: { low: "15 reps", base: "25 reps", high: "40 reps" },
        cues: ["Use the legs to drive the ball", "Catch softly into the next squat", "Keep elbows underneath"],
        durationSec: 160,
        restSec: 30,
        cycles: 1,
      },
    ],
    feedback: {
      rpePrompt: "How well did you hold your Hyrox pace and transitions today (1-10)?",
      loadPrompt: "Log your treadmill distance plus any sled, carry, or wall-ball loads used",
    },
  },
  "cardio-summit": {
    exercises: [
      {
        name: "Ski erg climb",
        equipment: "Ski erg",
        demoSummary: "Long aerobic interval with rising effort across the work period.",
        mediaSrc: "/exercise-media/ski-erg.svg",
        mediaAlt: "Ski erg climb demo",
        targets: { low: "10 calories", base: "14 calories", high: "18 calories" },
        cues: ["Find a sustainable rhythm", "Build in the final minute"],
      },
      {
        name: "Treadmill climb walk",
        equipment: "Treadmill",
        demoSummary: "Submaximal incline effort to improve aerobic durability.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill climb walk demo",
        targets: { low: "180 metres", base: "240 metres", high: "300 metres" },
        cues: ["Tall posture", "Keep steps even"],
      },
      {
        name: "Bike erg threshold",
        equipment: "Bike erg",
        demoSummary: "Sustained aerobic work with output rising through the set.",
        mediaSrc: "/exercise-media/bike-erg.svg",
        mediaAlt: "Bike erg threshold demo",
        targets: { low: "12 calories", base: "18 calories", high: "24 calories" },
        cues: ["Smooth cadence", "Hold through the last 30 seconds"],
      },
      {
        name: "Walking sled march",
        equipment: "Sled",
        demoSummary: "Non-impact locomotion that keeps aerobic strain high.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Walking sled march demo",
        targets: {
          low: "1 lane length",
          base: "2 lane lengths",
          high: "3 lane lengths",
        },
        cues: ["Steady pressure", "Do not sprint early"],
      },
      {
        name: "Assault bike settle",
        equipment: "Assault bike",
        demoSummary: "Controlled final station to keep the heart rate high but stable.",
        mediaSrc: "/exercise-media/assault-bike.svg",
        mediaAlt: "Assault bike settle demo",
        targets: { low: "10 calories", base: "14 calories", high: "18 calories" },
        cues: ["Settle into rhythm", "Strong finish"],
      },
    ],
    feedback: {
      rpePrompt: "How well did you pace the Cardio Summit session (1-10)?",
      loadPrompt: "Log your best calories or metres from the erg stations",
    },
  },
  "cardio-u": {
    exercises: [
      {
        name: "Treadmill pace builder",
        equipment: "Treadmill",
        demoSummary: "Progressive pace effort that teaches steady acceleration.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill pace builder demo",
        targets: { low: "200 metres", base: "260 metres", high: "320 metres" },
        cues: ["Increase gradually", "Relax the upper body"],
      },
      {
        name: "Bike erg pace hold",
        equipment: "Bike erg",
        demoSummary: "Maintain a learnable cadence and recover just enough before the next round.",
        mediaSrc: "/exercise-media/bike-erg.svg",
        mediaAlt: "Bike erg pace hold demo",
        targets: { low: "12 calories", base: "16 calories", high: "22 calories" },
        cues: ["Hold a repeatable cadence", "Breathe evenly"],
      },
      {
        name: "Ski erg rhythm pull",
        equipment: "Ski erg",
        demoSummary: "Aerobic upper-body work with consistent whole-body rhythm.",
        mediaSrc: "/exercise-media/ski-erg.svg",
        mediaAlt: "Ski erg rhythm pull demo",
        targets: { low: "10 calories", base: "14 calories", high: "18 calories" },
        cues: ["Tall setup", "Drive through the trunk"],
      },
      {
        name: "Assault bike push",
        equipment: "Assault bike",
        demoSummary: "Broader full-body conditioning with repeatable pace targets.",
        mediaSrc: "/exercise-media/assault-bike.svg",
        mediaAlt: "Assault bike push demo",
        targets: { low: "10 calories", base: "14 calories", high: "18 calories" },
        cues: ["Stay smooth", "Push the finish without fading"],
      },
      {
        name: "Lateral step-over pace",
        equipment: "Open floor",
        demoSummary: "Simple locomotor pattern to keep members moving between erg-based work.",
        mediaSrc: "/exercise-media/lateral-band-walk.svg",
        mediaAlt: "Lateral step over pace demo",
        targets: { low: "30 steps", base: "40 steps", high: "50 steps" },
        cues: ["Quick feet", "Stay light on the floor"],
      },
    ],
    feedback: {
      rpePrompt: "How well did you manage pacing and recovery today (1-10)?",
      loadPrompt: "Log the station where you hit your best output",
    },
  },
  "cardio-hiit": {
    exercises: [
      {
        name: "Assault bike sprint",
        equipment: "Assault bike",
        demoSummary: "Short, punchy interval to challenge anaerobic output.",
        mediaSrc: "/exercise-media/assault-bike.svg",
        mediaAlt: "Assault bike sprint demo",
        targets: { low: "9 calories", base: "13 calories", high: "17 calories" },
        cues: ["Explode early", "Hold on through the final seconds"],
        durationSec: 45,
        restSec: 30,
        cycles: 8,
      },
      {
        name: "Ski erg burst",
        equipment: "Ski erg",
        demoSummary: "Aggressive whole-body effort with fast recovery between rounds.",
        mediaSrc: "/exercise-media/ski-erg.svg",
        mediaAlt: "Ski erg burst demo",
        targets: { low: "8 calories", base: "12 calories", high: "16 calories" },
        cues: ["Fast hands", "Stay long through the hinge"],
        durationSec: 45,
        restSec: 30,
        cycles: 8,
      },
      {
        name: "Walking sled push",
        equipment: "Sled",
        demoSummary: "High-output leg drive that spikes heart rate without impact.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Walking sled push cardio HIIT demo",
        targets: {
          low: "1 lane length",
          base: "2 lane lengths",
          high: "3 lane lengths",
        },
        cues: ["Drive hard", "Keep steps short and quick"],
        durationSec: 45,
        restSec: 30,
        cycles: 8,
      },
      {
        name: "Bike erg sprint",
        equipment: "Bike erg",
        demoSummary: "Fast cadence repeat interval with clear calorie feedback.",
        mediaSrc: "/exercise-media/bike-erg.svg",
        mediaAlt: "Bike erg sprint demo",
        targets: { low: "10 calories", base: "14 calories", high: "18 calories" },
        cues: ["Accelerate fast", "Stay seated and smooth"],
        durationSec: 45,
        restSec: 30,
        cycles: 8,
      },
      {
        name: "Fast bodyweight squat",
        equipment: "Open floor",
        demoSummary: "Simple floor-based finisher to keep intensity high with minimal setup.",
        mediaSrc: "/exercise-media/bodyweight-squat.svg",
        mediaAlt: "Fast bodyweight squat demo",
        targets: { low: "16 reps", base: "22 reps", high: "28 reps" },
        cues: ["Move quickly but cleanly", "Keep chest up"],
        durationSec: 45,
        restSec: 30,
        cycles: 8,
      },
    ],
    feedback: {
      rpePrompt: "How close to your top gear did Cardio HIIT feel (1-10)?",
      loadPrompt: "Log your best calories or metres from today",
    },
  },
  crewfit: {
    exercises: [
      {
        name: "Treadmill pack pace",
        equipment: "Treadmill",
        demoSummary: "Repeatable team-style locomotion effort to open the session.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill pack pace demo",
        targets: { low: "200 metres", base: "260 metres", high: "320 metres" },
        cues: ["Settle early", "Finish stronger than you started"],
      },
      {
        name: "Ski erg team pull",
        equipment: "Ski erg",
        demoSummary: "Full-body output built around rhythm and consistency.",
        mediaSrc: "/exercise-media/ski-erg.svg",
        mediaAlt: "Ski erg team pull demo",
        targets: { low: "10 calories", base: "14 calories", high: "18 calories" },
        cues: ["Smooth pull-return", "Stay coordinated"],
      },
      {
        name: "Bike erg cadence push",
        equipment: "Bike erg",
        demoSummary: "Mid-session density work to keep the class moving.",
        mediaSrc: "/exercise-media/bike-erg.svg",
        mediaAlt: "Bike erg cadence push demo",
        targets: { low: "12 calories", base: "16 calories", high: "22 calories" },
        cues: ["Find a repeatable cadence", "Stay tall through trunk"],
      },
      {
        name: "Walking sled push",
        equipment: "Sled",
        demoSummary: "Simple but hard station that suits a high-energy class feel.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Walking sled push crewfit demo",
        targets: {
          low: "1 lane length",
          base: "2 lane lengths",
          high: "3 lane lengths",
        },
        cues: ["Keep hands fixed", "Drive continuously"],
      },
      {
        name: "Assault bike finish",
        equipment: "Assault bike",
        demoSummary: "Final conditioning push to finish the session with momentum.",
        mediaSrc: "/exercise-media/assault-bike.svg",
        mediaAlt: "Assault bike finish demo",
        targets: { low: "10 calories", base: "14 calories", high: "18 calories" },
        cues: ["Attack the last 30 seconds", "Keep shoulders relaxed"],
      },
    ],
    feedback: {
      rpePrompt: "How energetic and repeatable did CrewFit feel (1-10)?",
      loadPrompt: "Log the station where you felt strongest today",
    },
  },
  xtx: {
    exercises: [
      {
        name: "Barbell back squat",
        equipment: "Rack + barbell",
        demoSummary: "Foundational strength station to anchor the hybrid session.",
        mediaSrc: "/exercise-media/barbell-back-squat.svg",
        mediaAlt: "Barbell back squat XTX demo",
        targets: { low: "5 reps", base: "6 reps", high: "8 reps" },
        cues: ["Brace hard", "Drive evenly through the floor"],
      },
      {
        name: "Assault bike surge",
        equipment: "Assault bike",
        demoSummary: "Raise systemic demand before returning to loaded work.",
        mediaSrc: "/exercise-media/assault-bike.svg",
        mediaAlt: "Assault bike XTX demo",
        targets: { low: "8 calories", base: "12 calories", high: "16 calories" },
        cues: ["Push smoothly", "Stay aggressive through the finish"],
      },
      {
        name: "Dumbbell Romanian deadlift",
        equipment: "Dumbbells",
        demoSummary: "Posterior-chain strength under metabolic pressure.",
        mediaSrc: "/exercise-media/dumbbell-rdl.svg",
        mediaAlt: "Dumbbell RDL XTX demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Keep tension in hamstrings", "Maintain a neutral spine"],
      },
      {
        name: "Ski erg drive",
        equipment: "Ski erg",
        demoSummary: "Aerobic-anaerobic bridge station using full-body rhythm.",
        mediaSrc: "/exercise-media/ski-erg.svg",
        mediaAlt: "Ski erg XTX demo",
        targets: { low: "8 calories", base: "12 calories", high: "16 calories" },
        cues: ["Strong hip snap", "Finish each pull"],
      },
      {
        name: "Rear-foot elevated split squat",
        equipment: "Bench + dumbbells",
        demoSummary: "Close with unilateral strength while fatigue is already present.",
        mediaSrc: "/exercise-media/split-squat.svg",
        mediaAlt: "Split squat XTX demo",
        targets: {
          low: "8 reps per leg",
          base: "10 reps per leg",
          high: "12 reps per leg",
        },
        cues: ["Stay balanced", "Keep front heel rooted"],
      },
    ],
    feedback: {
      rpePrompt: "How balanced did the strength and conditioning demands feel (1-10)?",
      loadPrompt: "Log your main lifts and strongest erg output",
    },
  },
  "strength-endurance": {
    exercises: [
      {
        name: "Barbell back squat",
        equipment: "Rack + barbell",
        demoSummary: "Submaximal strength repeated across longer total work duration.",
        mediaSrc: "/exercise-media/barbell-back-squat.svg",
        mediaAlt: "Barbell squat strength endurance demo",
        targets: { low: "6 reps", base: "8 reps", high: "10 reps" },
        cues: ["Stay efficient", "Keep rep quality high late in the set"],
      },
      {
        name: "Rear-foot elevated split squat",
        equipment: "Bench + dumbbells",
        demoSummary: "Unilateral volume that keeps force output honest under fatigue.",
        mediaSrc: "/exercise-media/split-squat.svg",
        mediaAlt: "Split squat strength endurance demo",
        targets: {
          low: "8 reps per leg",
          base: "10 reps per leg",
          high: "12 reps per leg",
        },
        cues: ["Control the bottom", "Drive back to full lockout"],
      },
      {
        name: "Bike erg pace hold",
        equipment: "Bike erg",
        demoSummary: "Conditioning station that challenges recovery without breaking mechanics.",
        mediaSrc: "/exercise-media/bike-erg.svg",
        mediaAlt: "Bike erg strength endurance demo",
        targets: { low: "10 calories", base: "14 calories", high: "18 calories" },
        cues: ["Stay repeatable", "Do not spike too early"],
      },
      {
        name: "Dumbbell Romanian deadlift",
        equipment: "Dumbbells",
        demoSummary: "Hinge endurance paired with trunk discipline.",
        mediaSrc: "/exercise-media/dumbbell-rdl.svg",
        mediaAlt: "Dumbbell RDL strength endurance demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Stay long", "Move smoothly under fatigue"],
      },
      {
        name: "Fast bodyweight squat",
        equipment: "Open floor",
        demoSummary: "Simple final station to test how well strength carries late into the session.",
        mediaSrc: "/exercise-media/bodyweight-squat.svg",
        mediaAlt: "Fast bodyweight squat strength endurance demo",
        targets: { low: "16 reps", base: "20 reps", high: "26 reps" },
        cues: ["Move continuously", "Stay braced while breathing"],
      },
    ],
    feedback: {
      rpePrompt: "How well did you maintain strength under fatigue (1-10)?",
      loadPrompt: "Log your squat load and best bike-erg score",
    },
  },
  shred: {
    exercises: [
      {
        name: "Assault bike surge",
        equipment: "Assault bike",
        demoSummary: "Open with a high-energy calorie target and controlled recovery.",
        mediaSrc: "/exercise-media/assault-bike.svg",
        mediaAlt: "Assault bike shred demo",
        targets: { low: "9 calories", base: "13 calories", high: "17 calories" },
        cues: ["Build fast", "Stay smooth through the finish"],
      },
      {
        name: "Dumbbell Romanian deadlift",
        equipment: "Dumbbells",
        demoSummary: "Resistance station that keeps total work density high.",
        mediaSrc: "/exercise-media/dumbbell-rdl.svg",
        mediaAlt: "Dumbbell RDL shred demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Strong hinge", "No wasted movement"],
      },
      {
        name: "Walking sled push",
        equipment: "Sled",
        demoSummary: "Leg-driven conditioner with no technical learning curve.",
        mediaSrc: "/exercise-media/sled-push.svg",
        mediaAlt: "Sled push shred demo",
        targets: {
          low: "1 lane length",
          base: "2 lane lengths",
          high: "3 lane lengths",
        },
        cues: ["Stay moving", "Keep pressure through the handles"],
      },
      {
        name: "Bodyweight squat flow",
        equipment: "Open floor",
        demoSummary: "Accessible floor station to keep calorie burn high between machines.",
        mediaSrc: "/exercise-media/bodyweight-squat.svg",
        mediaAlt: "Bodyweight squat flow demo",
        targets: { low: "16 reps", base: "22 reps", high: "28 reps" },
        cues: ["Keep rhythm", "Breathe as you move"],
      },
      {
        name: "Ski erg drive",
        equipment: "Ski erg",
        demoSummary: "Whole-body conditioning closer to the end of the session.",
        mediaSrc: "/exercise-media/ski-erg.svg",
        mediaAlt: "Ski erg shred demo",
        targets: { low: "8 calories", base: "12 calories", high: "16 calories" },
        cues: ["Use the trunk", "Finish strong"],
      },
    ],
    feedback: {
      rpePrompt: "How continuously hard did Shred feel today (1-10)?",
      loadPrompt: "Log your best calorie station and dumbbell load",
    },
  },
  balanced: {
    exercises: [
      {
        name: "Lateral control step",
        equipment: "Open floor",
        demoSummary: "Frontal-plane movement to improve balance and joint control.",
        mediaSrc: "/exercise-media/lateral-band-walk.svg",
        mediaAlt: "Lateral control step demo",
        targets: { low: "10 steps", base: "14 steps", high: "18 steps" },
        cues: ["Stay low", "Move with control"],
        durationSec: 58,
        restSec: 43,
        cycles: 6,
      },
      {
        name: "Glute bridge hold",
        equipment: "Open floor",
        demoSummary: "Posterior-chain stability station with low coordination cost.",
        mediaSrc: "/exercise-media/glute-bridge.svg",
        mediaAlt: "Glute bridge balanced demo",
        targets: { low: "30-second hold", base: "40-second hold", high: "50-second hold" },
        cues: ["Keep hips level", "Maintain steady breathing"],
        durationSec: 50,
        restSec: 45,
        cycles: 6,
      },
      {
        name: "Bodyweight squat",
        equipment: "Open floor",
        demoSummary: "Controlled full-body pattern emphasizing shape and range of motion.",
        mediaSrc: "/exercise-media/bodyweight-squat.svg",
        mediaAlt: "Bodyweight squat balanced demo",
        targets: { low: "10 reps", base: "12 reps", high: "14 reps" },
        cues: ["Move slow and clean", "Stay evenly balanced"],
        durationSec: 58,
        restSec: 43,
        cycles: 6,
      },
      {
        name: "Walking lunge with reach",
        equipment: "Open floor",
        demoSummary: "Combine hip mobility, trunk reach, and single-leg control.",
        mediaSrc: "/exercise-media/lunge-reach.svg",
        mediaAlt: "Walking lunge balanced demo",
        targets: { low: "8 steps", base: "10 steps", high: "14 steps" },
        cues: ["Step softly", "Reach without flaring the ribs"],
        durationSec: 58,
        restSec: 43,
        cycles: 6,
      },
      {
        name: "Treadmill recovery pace",
        equipment: "Treadmill",
        demoSummary: "Light conditioning finish to keep the session rounded out.",
        mediaSrc: "/exercise-media/treadmill-walk.svg",
        mediaAlt: "Treadmill recovery pace demo",
        targets: { low: "160 metres", base: "220 metres", high: "280 metres" },
        cues: ["Relax shoulders", "Walk with long strides"],
        durationSec: 66,
        restSec: 40,
        cycles: 6,
      },
    ],
    feedback: {
      rpePrompt: "How controlled and well-rounded did Balanced feel (1-10)?",
      loadPrompt: "Log any loads used or note that you stayed bodyweight",
    },
  },
};

function createWorkoutForProgram(programId: string, dayLabel: string): DailyWorkout {
  const definition = getProgramDefinition(programId);
  const seed = programSeeds[programId as ProgramId] ?? programSeeds.strength;

  return normalizeDailyWorkout({
    slug: `${slugify(definition.name)}-${slugify(dayLabel)}-001`,
    programId,
    programGroup: definition.group,
    dayLabel,
    category: definition.name,
    focus: definition.focus,
    scienceNote: definition.scienceNote,
    estimatedDurationMin: 60,
    warmup: seed.warmup ?? createWarmup(programId as ProgramId, definition.name),
    cooldown: seed.cooldown ?? createCooldown(programId as ProgramId, definition.name),
    blocks: [
      {
        title: "Main session",
        format: definition.focus,
        rounds: 1,
        exercises: seed.exercises.map((exercise) => createMainExercise(exercise, programId as ProgramId)),
      },
    ],
    feedback: seed.feedback,
  });
}

export function getCurrentSingaporeDayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "long",
    timeZone: "Asia/Singapore",
  }).format(date);
}

export function getWorkoutForProgram(programId: string, dayLabel = "Monday") {
  return createWorkoutForProgram(programId, dayLabel);
}

export function getWorkoutForDay(dayLabel: string, date = new Date()): DailyWorkout {
  const weekdayIndex = Math.max(
    0,
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayLabel),
  );
  const program = getProgramForWeekday(weekdayIndex, date);

  return createWorkoutForProgram(program.id, dayLabel);
}

export function getWorkoutForCurrentDay(date = new Date()) {
  return getWorkoutForDay(getCurrentSingaporeDayLabel(date), date);
}

export function getWeeklySchedule(date = new Date()): WeeklyScheduleEntry[] {
  return getRotationSchedule(date).map((entry) => ({
    day: entry.day,
    programId: entry.programId,
    group: entry.group,
    category: entry.category,
    focus: entry.focus,
  }));
}

export const weeklySchedule: WeeklyScheduleEntry[] = getWeeklySchedule();

export const workoutOfTheDay = getWorkoutForCurrentDay();
