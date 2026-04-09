import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { canonicalExerciseNames } from "../lib/exercise-catalog.ts";
import { inferExerciseTaxonomy } from "../lib/exercise-taxonomy.ts";

const INTERNAL_LIBRARY_SLUG = "ravqen-internal-exercise-library";

function readEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return content.split("\n").reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return acc;
    }

    const index = trimmed.indexOf("=");
    if (index < 0) {
      return acc;
    }

    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    acc[key] = value;
    return acc;
  }, {});
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildEntryId(item, index) {
  return [
    "lib",
    slugify(item.section),
    slugify(item.exerciseName),
    slugify(item.equipment || "gym-floor"),
    slugify(item.mediaSrc || "exercise-media"),
    index + 1,
  ]
    .filter(Boolean)
    .join("-");
}

function normalizeEntries(entries) {
  return entries.map((entry, index) => ({
    ...entry,
    id: buildEntryId(entry, index),
  }));
}

function uniqueNames(names) {
  const seen = new Set();
  const result = [];

  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(name.trim());
  }

  return result;
}

function defaultMediaPath() {
  return "/exercise-media/bodyweight-squat.svg";
}

function inferExercisePreset(exerciseName, taxonomy) {
  const lowerName = exerciseName.toLowerCase();
  const primarySection = taxonomy.usageContexts.includes("Main session")
    ? "Main session"
    : taxonomy.usageContexts.includes("Warm-up")
      ? "Warm-up"
      : "Cool-down";

  const isHoldLike =
    taxonomy.typeCategory === "Isometric" ||
    taxonomy.typeCategory === "Yoga" ||
    lowerName.includes("plank") ||
    lowerName.includes("hold") ||
    lowerName.includes("wall sit") ||
    lowerName.includes("boat pose") ||
    lowerName.includes("bridge pose");

  const isCardioLike =
    taxonomy.typeCategory === "Cardio" ||
    lowerName.includes("run") ||
    lowerName.includes("row") ||
    lowerName.includes("ski") ||
    lowerName.includes("bike") ||
    lowerName.includes("jump rope") ||
    lowerName.includes("high knees");

  const isMobilityLike =
    taxonomy.typeCategory === "Stretching" ||
    taxonomy.typeCategory === "Yoga" ||
    taxonomy.typeCategory === "Balance";

  if (primarySection !== "Main session") {
    return {
      section: primarySection,
      targetValue: isHoldLike || isMobilityLike ? "30" : isCardioLike ? "35" : "8",
      unit: isHoldLike || isMobilityLike || isCardioLike ? "seconds" : "reps",
      prescriptionType: isHoldLike ? "hold" : isCardioLike || isMobilityLike ? "time" : "reps",
      durationSec: isHoldLike ? 30 : isCardioLike ? 35 : isMobilityLike ? 30 : 35,
      restSec: 0,
      cycles: 1,
    };
  }

  if (isCardioLike) {
    return {
      section: primarySection,
      targetValue: "45",
      unit: "seconds",
      prescriptionType: "time",
      durationSec: 45,
      restSec: 25,
      cycles: 5,
    };
  }

  if (isHoldLike) {
    return {
      section: primarySection,
      targetValue: "30",
      unit: "seconds",
      prescriptionType: "hold",
      durationSec: 30,
      restSec: 20,
      cycles: 4,
    };
  }

  return {
    section: primarySection,
    targetValue: "10",
    unit: "reps",
    prescriptionType: "reps",
    durationSec: 50,
    restSec: 40,
    cycles: 4,
  };
}

function buildEntry(exerciseName) {
  const taxonomy = inferExerciseTaxonomy({
    exerciseName,
    equipment: "",
  });
  const preset = inferExercisePreset(exerciseName, taxonomy);

  return {
    id: "",
    section: preset.section,
    exerciseName,
    mediaSourceType: "internal",
    equipment: taxonomy.equipmentCategory === "Bodyweight" ? "Bodyweight" : taxonomy.equipmentCategory,
    demoSummary: `${exerciseName} exercise demo.`,
    mediaSrc: defaultMediaPath(),
    mediaAlt: `${exerciseName} demo`,
    prescriptionType: preset.prescriptionType,
    coachingNote: undefined,
    targetValue: preset.targetValue,
    unit: preset.unit,
    cycles: preset.cycles,
    restSec: preset.restSec,
    durationSec: preset.durationSec,
    cues: [],
    tags: [],
    muscleCategory: taxonomy.muscleCategory,
    typeCategory: taxonomy.typeCategory,
    equipmentCategory: taxonomy.equipmentCategory,
    usageContexts: taxonomy.usageContexts,
  };
}

const env = readEnvFile(path.join(process.cwd(), ".env.local"));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingRow, error: existingError } = await supabase
  .from("workout_templates")
  .select("slug, title, category, focus, structure")
  .eq("slug", INTERNAL_LIBRARY_SLUG)
  .maybeSingle();

if (existingError) {
  throw existingError;
}

const existingEntries = Array.isArray(existingRow?.structure?.entries)
  ? existingRow.structure.entries
  : [];

const existingByName = new Set(
  existingEntries.map((entry) => String(entry.exerciseName || "").trim().toLowerCase()).filter(Boolean),
);

const additions = uniqueNames(canonicalExerciseNames)
  .filter((name) => !existingByName.has(name.toLowerCase()))
  .map(buildEntry);

const mergedEntries = normalizeEntries([...existingEntries, ...additions]);

const { error: upsertError } = await supabase.from("workout_templates").upsert(
  {
    slug: INTERNAL_LIBRARY_SLUG,
    title: existingRow?.title ?? "Ravqen Internal Exercise Library",
    category: existingRow?.category ?? "System",
    focus: existingRow?.focus ?? "Internal exercise library",
    estimated_duration_min: 0,
    is_active: true,
    structure: {
      kind: "internal-exercise-library",
      entries: mergedEntries,
      updated_for: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Singapore",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
      import_summary: {
        previousCount: existingEntries.length,
        importedCount: additions.length,
        totalCount: mergedEntries.length,
      },
    },
  },
  { onConflict: "slug" },
);

if (upsertError) {
  throw upsertError;
}

console.log(
  JSON.stringify(
    {
      previousCount: existingEntries.length,
      importedCount: additions.length,
      totalCount: mergedEntries.length,
    },
    null,
    2,
  ),
);
