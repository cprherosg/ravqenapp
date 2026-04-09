import { cache } from "react";
import { getWorkoutForProgram } from "@/lib/data";
import { inferPrescriptionType, normalizeWorkoutExercise } from "@/lib/coaching-framework";
import { getProgramDefinition, programCatalog, type ProgramId } from "@/lib/program-catalog";
import {
  type DateProgramOverride,
  getCurrentWeekScheduleSummary,
  getProgramDefinitions,
  getRotationCalendarSlots,
  workoutFromProgramDefinition,
  type InternalExerciseLibraryEntry,
  type ProgramDefinition,
  type RotationCalendarSlot,
} from "@/lib/program-editor-data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { DailyWorkout } from "@/lib/types";
import { fetchYmoveExercise, hasYmoveApiKey } from "@/lib/ymove";

const PROGRAM_SLUG_PREFIX = "ravqen-program-";
const ROTATION_CALENDAR_SLUG = "ravqen-rotation-calendar";
const INTERNAL_LIBRARY_SLUG = "ravqen-internal-exercise-library";
const DELETED_PROGRAM_IDS_SLUG = "ravqen-deleted-program-ids";

function programSlug(programId: string) {
  return `${PROGRAM_SLUG_PREFIX}${programId}`;
}

function currentSingaporeDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function currentSingaporeDayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    weekday: "long",
  }).format(date);
}

function slugifyInternalLibraryPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildInternalLibraryEntryId(
  item: Pick<InternalExerciseLibraryEntry, "section" | "exerciseName" | "mediaSrc" | "equipment">,
  index: number,
) {
  return [
    "lib",
    slugifyInternalLibraryPart(item.section),
    slugifyInternalLibraryPart(item.exerciseName),
    slugifyInternalLibraryPart(item.equipment || "gym-floor"),
    slugifyInternalLibraryPart(item.mediaSrc || "local-media"),
    index + 1,
  ]
    .filter(Boolean)
    .join("-");
}

function normalizeInternalLibraryEntries(entries: InternalExerciseLibraryEntry[]) {
  const seenContent = new Set<string>();

  return entries
    .map((item) => ({
      ...item,
      status: item.status ?? "active",
    }))
    .filter((item) => {
      const contentKey = [
        item.section,
        item.exerciseName.trim().toLowerCase(),
        item.mediaSrc.trim().toLowerCase(),
        item.equipment.trim().toLowerCase(),
      ].join("::");

      if (seenContent.has(contentKey)) {
        return false;
      }

      seenContent.add(contentKey);
      return true;
    })
    .map((item, index) => ({
      ...item,
      id: buildInternalLibraryEntryId(item, index),
    }));
}

function normalizeProgramDefinition(program: ProgramDefinition): ProgramDefinition {
  return {
    ...program,
    status: program.status ?? "active",
    kind:
      program.kind ??
      (programCatalog.some((catalogProgram) => catalogProgram.id === program.id)
        ? "system"
        : "custom"),
    timeline: program.timeline.map((item) => ({
      ...item,
      ...normalizeWorkoutExercise(program.id, item.section, {
        name: item.exerciseName,
        durationSec: item.durationSec,
        restSec: item.restSec,
        cycles: item.cycles,
        prescriptionType:
          item.prescriptionType ?? inferPrescriptionType(`${item.targetValue} ${item.unit}`.trim(), item.unit),
        coachingNote: item.coachingNote,
        mediaSourceType: item.mediaSourceType,
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
      }),
      exerciseName: item.exerciseName,
      mediaSourceType: item.mediaSourceType,
      targetValue: item.targetValue,
      unit: item.unit,
    })),
  };
}

async function seedDefaultProgramming() {
  const supabase = createAdminSupabaseClient();
  const defaultPrograms = getProgramDefinitions().map(normalizeProgramDefinition);
  const defaultCalendar = getRotationCalendarSlots();
  const defaultInternalLibrary = normalizeInternalLibraryEntries(
    buildDefaultInternalExerciseLibrary(defaultPrograms),
  );

  await Promise.all([
    supabase.from("workout_templates").upsert(
      defaultPrograms.map((program) => ({
        slug: programSlug(program.id),
        title: program.category,
        category: program.category,
        focus: program.focus,
        estimated_duration_min: program.estimatedDurationMin,
        is_active: true,
        structure: {
          kind: "program-definition",
          program,
        },
      })),
      { onConflict: "slug" },
    ),
    supabase.from("workout_templates").upsert(
      {
        slug: ROTATION_CALENDAR_SLUG,
        title: "Ravqen Rotation Calendar",
        category: "System",
        focus: "4-week rotation calendar",
        estimated_duration_min: 0,
        is_active: true,
        structure: {
          kind: "rotation-calendar",
          slots: defaultCalendar,
          seeded_for: currentSingaporeDateKey(),
        },
      },
      { onConflict: "slug" },
    ),
    supabase.from("workout_templates").upsert(
      {
        slug: INTERNAL_LIBRARY_SLUG,
        title: "Ravqen Internal Exercise Library",
        category: "System",
        focus: "Internal exercise library",
        estimated_duration_min: 0,
        is_active: true,
        structure: {
          kind: "internal-exercise-library",
          entries: defaultInternalLibrary,
          seeded_for: currentSingaporeDateKey(),
        },
      },
      { onConflict: "slug" },
    ),
    supabase.from("workout_templates").upsert(
      {
        slug: DELETED_PROGRAM_IDS_SLUG,
        title: "Ravqen Deleted Program IDs",
        category: "System",
        focus: "Deleted program tombstones",
        estimated_duration_min: 0,
        is_active: true,
        structure: {
          kind: "deleted-program-ids",
          ids: [],
          updated_for: currentSingaporeDateKey(),
        },
      },
      { onConflict: "slug" },
    ),
  ]);

  return {
    programs: defaultPrograms,
    calendar: defaultCalendar,
    internalLibrary: defaultInternalLibrary,
    dateOverrides: [] as DateProgramOverride[],
  };
}

async function backfillDefaultProgramming(
  programs: ProgramDefinition[],
  internalLibrary: InternalExerciseLibraryEntry[],
  deletedProgramIds: string[],
) {
  const supabase = createAdminSupabaseClient();
  const defaultPrograms = getProgramDefinitions().map(normalizeProgramDefinition);
  const defaultInternalLibrary = normalizeInternalLibraryEntries(
    buildDefaultInternalExerciseLibrary(defaultPrograms),
  );

  const missingPrograms = defaultPrograms.filter(
    (defaultProgram) =>
      !deletedProgramIds.includes(defaultProgram.id) &&
      !programs.some((program) => program.id === defaultProgram.id),
  );
  const canonicalHyrox = defaultPrograms.find((program) => program.id === "hyrox");
  const existingHyrox = programs.find((program) => program.id === "hyrox");
  const canonicalHyroxExerciseNames = canonicalHyrox?.timeline.map((item) => item.exerciseName) ?? [];
  const existingHyroxExerciseNames = existingHyrox?.timeline.map((item) => item.exerciseName) ?? [];
  const shouldRefreshHyrox =
    Boolean(canonicalHyrox) &&
    JSON.stringify(existingHyroxExerciseNames) !== JSON.stringify(canonicalHyroxExerciseNames);

  const missingLibraryEntries = defaultInternalLibrary.filter(
    (defaultEntry) =>
      !internalLibrary.some(
        (entry) =>
          entry.section === defaultEntry.section &&
          entry.exerciseName === defaultEntry.exerciseName &&
          entry.mediaSrc === defaultEntry.mediaSrc,
      ),
  );

  if (missingPrograms.length) {
    await supabase.from("workout_templates").upsert(
      missingPrograms.map((program) => ({
        slug: programSlug(program.id),
        title: program.category,
        category: program.category,
        focus: program.focus,
        estimated_duration_min: program.estimatedDurationMin,
        is_active: true,
        structure: {
          kind: "program-definition",
          program,
        },
      })),
      { onConflict: "slug" },
    );
  }

  if (canonicalHyrox && shouldRefreshHyrox) {
    await supabase.from("workout_templates").upsert(
      {
        slug: programSlug(canonicalHyrox.id),
        title: canonicalHyrox.category,
        category: canonicalHyrox.category,
        focus: canonicalHyrox.focus,
        estimated_duration_min: canonicalHyrox.estimatedDurationMin,
        is_active: true,
        structure: {
          kind: "program-definition",
          program: canonicalHyrox,
        },
      },
      { onConflict: "slug" },
    );
  }

  if (missingLibraryEntries.length) {
    await supabase.from("workout_templates").upsert(
      {
        slug: INTERNAL_LIBRARY_SLUG,
        title: "Ravqen Internal Exercise Library",
        category: "System",
        focus: "Internal exercise library",
        estimated_duration_min: 0,
        is_active: true,
        structure: {
          kind: "internal-exercise-library",
          entries: normalizeInternalLibraryEntries([
            ...internalLibrary,
            ...missingLibraryEntries,
          ]),
          updated_for: currentSingaporeDateKey(),
        },
      },
      { onConflict: "slug" },
    );
  }

  return {
    programs: [
      ...programs.filter((program) => program.id !== "hyrox"),
      ...(canonicalHyrox ? [canonicalHyrox] : []),
      ...missingPrograms.filter((program) => program.id !== "hyrox"),
    ],
    internalLibrary: normalizeInternalLibraryEntries([
      ...internalLibrary,
      ...missingLibraryEntries,
    ]),
  };
}

function buildDefaultInternalExerciseLibrary(
  programs: ProgramDefinition[],
): InternalExerciseLibraryEntry[] {
  const seen = new Set<string>();

  return programs
    .flatMap((program) => program.timeline)
    .filter((item) => item.mediaSourceType !== "ymove")
    .filter((item) => {
      const key = `${item.section}:${item.exerciseName}:${item.mediaSrc}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item, index) => ({
      id: buildInternalLibraryEntryId(
        {
          section: item.section,
          exerciseName: item.exerciseName,
          mediaSrc: item.mediaSrc,
          equipment: item.equipment,
        },
        index,
      ),
      section: item.section,
      exerciseName: item.exerciseName,
      mediaSourceType:
        item.mediaSourceType === "external" ? "external" : "internal",
      equipment: item.equipment,
      demoSummary: item.demoSummary,
      mediaSrc: item.mediaSrc,
      mediaAlt: item.mediaAlt,
      prescriptionType: item.prescriptionType,
      coachingNote: item.coachingNote,
      targetValue: item.targetValue,
      unit: item.unit,
      cycles: item.cycles,
      restSec: item.restSec,
      durationSec: item.durationSec,
      cues: item.cues,
      tags: item.tags ?? [],
      muscleCategory: item.muscleCategory,
      typeCategory: item.typeCategory,
      equipmentCategory: item.equipmentCategory,
      usageContexts: item.usageContexts ?? [item.section],
      status: "active",
    }));
}

async function hydrateYmoveProgramDefinition(program: ProgramDefinition) {
  if (!hasYmoveApiKey()) {
    return program;
  }

  const hydratedTimeline = await Promise.all(
    program.timeline.map(async (item) => {
      if (item.mediaSourceType !== "ymove") {
        return item;
      }

      const sourceKey = item.ymoveExerciseSlug ?? item.ymoveExerciseId;
      if (!sourceKey) {
        return item;
      }

      try {
        const ymoveExercise = await fetchYmoveExercise(sourceKey);

        return {
          ...item,
          exerciseName: ymoveExercise.title || item.exerciseName,
          equipment: ymoveExercise.equipment?.join(", ") || item.equipment,
          demoSummary:
            ymoveExercise.instructions?.slice(0, 2).join(" ") || item.demoSummary,
          mediaAlt: `${ymoveExercise.title} demo`,
          cues: ymoveExercise.instructions?.slice(0, 2) ?? item.cues,
          mediaSrc: "/exercise-media/transition-rest.svg",
        };
      } catch {
        return item;
      }
    }),
  );

  return {
    ...program,
    timeline: hydratedTimeline,
  };
}

async function resolveYmoveMedia<T extends DailyWorkout>(workout: T): Promise<T> {
  if (!hasYmoveApiKey()) {
    return workout;
  }

  const resolveExercise = async (exercise: T["warmup"][number]) => {
    const candidate = exercise as T["warmup"][number] & {
      ymoveExerciseId?: string;
      ymoveExerciseSlug?: string;
      mediaSourceType?: string;
    };

    if (candidate.mediaSourceType !== "ymove") {
      return exercise;
    }

    const sourceKey = candidate.ymoveExerciseSlug ?? candidate.ymoveExerciseId;

    if (!sourceKey) {
      return exercise;
    }

    try {
      const ymoveExercise = await fetchYmoveExercise(sourceKey);

      return {
        ...exercise,
        mediaSrc: ymoveExercise.videoUrl ?? ymoveExercise.thumbnailUrl ?? exercise.mediaSrc,
        mediaAlt: `${ymoveExercise.title} demo`,
        demoSummary:
          ymoveExercise.instructions?.slice(0, 2).join(" ") || exercise.demoSummary,
      };
    } catch {
      return exercise;
    }
  };

  const [warmup, cooldown, blocks] = await Promise.all([
    Promise.all(workout.warmup.map(resolveExercise)),
    Promise.all(workout.cooldown.map(resolveExercise)),
    Promise.all(
      workout.blocks.map(async (block) => ({
        ...block,
        exercises: await Promise.all(block.exercises.map(resolveExercise)),
      })),
    ),
  ]);

  return {
    ...workout,
    warmup,
    cooldown,
    blocks,
  };
}

export const getProgrammingStudioBootstrap = cache(async function getProgrammingStudioBootstrap() {
  try {
    const supabase = createAdminSupabaseClient();
    const [
      { data: programRows, error: programsError },
      { data: calendarRows, error: calendarError },
      { data: libraryRows, error: libraryError },
      { data: deletedRows, error: deletedError },
    ] = await Promise.all([
      supabase
        .from("workout_templates")
        .select("slug,title,category,focus,estimated_duration_min,structure")
        .like("slug", `${PROGRAM_SLUG_PREFIX}%`),
      supabase
        .from("workout_templates")
        .select("slug,title,category,focus,estimated_duration_min,structure")
        .eq("slug", ROTATION_CALENDAR_SLUG)
        .limit(1),
      supabase
        .from("workout_templates")
        .select("slug,title,category,focus,estimated_duration_min,structure")
        .eq("slug", INTERNAL_LIBRARY_SLUG)
        .limit(1),
      supabase
        .from("workout_templates")
        .select("slug,title,category,focus,estimated_duration_min,structure")
        .eq("slug", DELETED_PROGRAM_IDS_SLUG)
        .limit(1),
    ]);

    if (programsError) {
      throw programsError;
    }

    if (calendarError) {
      throw calendarError;
    }

    if (libraryError) {
      throw libraryError;
    }
    if (deletedError) {
      throw deletedError;
    }

    const data = [
      ...(programRows ?? []),
      ...(calendarRows ?? []),
      ...(libraryRows ?? []),
      ...(deletedRows ?? []),
    ];
    if (!data.length) {
      return seedDefaultProgramming();
    }

    const programs = data
      .filter((row) => row.slug.startsWith(PROGRAM_SLUG_PREFIX))
      .map((row) => {
        const structure = row.structure as { program?: ProgramDefinition } | null;
        return structure?.program ? normalizeProgramDefinition(structure.program) : undefined;
      })
      .filter((program): program is ProgramDefinition => Boolean(program));

    const calendarStructure = data.find((row) => row.slug === ROTATION_CALENDAR_SLUG)
      ?.structure as { slots?: RotationCalendarSlot[]; dateOverrides?: DateProgramOverride[] } | null;
    const libraryStructure = data.find((row) => row.slug === INTERNAL_LIBRARY_SLUG)
      ?.structure as { entries?: InternalExerciseLibraryEntry[] } | null;
    const deletedProgramStructure = data.find((row) => row.slug === DELETED_PROGRAM_IDS_SLUG)
      ?.structure as { ids?: string[] } | null;
    const deletedProgramIds = deletedProgramStructure?.ids ?? [];

    if (!programs.length || !calendarStructure?.slots?.length || !libraryStructure?.entries?.length) {
      return seedDefaultProgramming();
    }

    const visiblePrograms = programs.filter((program) => !deletedProgramIds.includes(program.id));

    const normalizedLibraryEntries = normalizeInternalLibraryEntries(
      libraryStructure.entries,
    );
    const backfilled = await backfillDefaultProgramming(
      visiblePrograms,
      normalizedLibraryEntries,
      deletedProgramIds,
    );

    return {
      programs: backfilled.programs,
      calendar: calendarStructure.slots,
      internalLibrary: backfilled.internalLibrary,
      dateOverrides: calendarStructure.dateOverrides ?? [],
    };
  } catch {
    return {
      programs: getProgramDefinitions().map(normalizeProgramDefinition),
      calendar: getRotationCalendarSlots(),
      internalLibrary: normalizeInternalLibraryEntries(
        buildDefaultInternalExerciseLibrary(getProgramDefinitions()),
      ),
      dateOverrides: [] as DateProgramOverride[],
    };
  }
});

export async function saveProgramDefinition(program: ProgramDefinition) {
  const supabase = createAdminSupabaseClient();
  const hydratedProgram = normalizeProgramDefinition(
    await hydrateYmoveProgramDefinition(program),
  );
  const { error } = await supabase.from("workout_templates").upsert(
    {
      slug: programSlug(hydratedProgram.id),
      title: hydratedProgram.category,
      category: hydratedProgram.category,
      focus: hydratedProgram.focus,
      estimated_duration_min: hydratedProgram.estimatedDurationMin,
      is_active: hydratedProgram.status !== "archived",
      structure: {
        kind: "program-definition",
        program: hydratedProgram,
      },
    },
    { onConflict: "slug" },
  );

  if (error) {
    throw error;
  }

  const { data: deletedRow } = await supabase
    .from("workout_templates")
    .select("structure")
    .eq("slug", DELETED_PROGRAM_IDS_SLUG)
    .maybeSingle();
  const currentIds = ((deletedRow?.structure as { ids?: string[] } | null)?.ids ?? []).filter(
    (id) => id !== hydratedProgram.id,
  );
  await supabase.from("workout_templates").upsert(
    {
      slug: DELETED_PROGRAM_IDS_SLUG,
      title: "Ravqen Deleted Program IDs",
      category: "System",
      focus: "Deleted program tombstones",
      estimated_duration_min: 0,
      is_active: true,
      structure: {
        kind: "deleted-program-ids",
        ids: currentIds,
        updated_for: currentSingaporeDateKey(),
      },
    },
    { onConflict: "slug" },
  );
}

export async function archiveProgramDefinition(programId: string) {
  const supabase = createAdminSupabaseClient();
  const bootstrap = await getProgrammingStudioBootstrap();
  const targetProgram = bootstrap.programs.find((program) => program.id === programId);

  if (!targetProgram) {
    throw new Error("Program not found.");
  }

  if (targetProgram.kind === "system") {
    throw new Error(
      "System/core programs are protected. Duplicate the program first if you want a custom version.",
    );
  }

  const activeAlternatives = bootstrap.programs.filter(
    (program) => program.id !== programId && program.status !== "archived",
  );

  if (!activeAlternatives.length) {
    throw new Error("At least one active program must remain.");
  }

  const fallbackProgram = activeAlternatives[0] ?? getProgramDefinition("strength");
  const archivedProgram = {
    ...targetProgram,
    status: "archived" as const,
  };

  const { error } = await supabase.from("workout_templates").upsert(
    {
      slug: programSlug(archivedProgram.id),
      title: archivedProgram.category,
      category: archivedProgram.category,
      focus: archivedProgram.focus,
      estimated_duration_min: archivedProgram.estimatedDurationMin,
      is_active: false,
      structure: {
        kind: "program-definition",
        program: archivedProgram,
      },
    },
    { onConflict: "slug" },
  );

  if (error) {
    throw error;
  }

  const nextCalendar = bootstrap.calendar.map((slot) =>
    slot.programId !== programId
      ? slot
      : {
          ...slot,
          programId: fallbackProgram.id,
          category: fallbackProgram.category,
          group: fallbackProgram.group,
          focus: fallbackProgram.focus,
        },
  );

  const nextOverrides = bootstrap.dateOverrides.map((override) =>
    override.programId !== programId
      ? override
      : {
          ...override,
          programId: fallbackProgram.id,
          category: fallbackProgram.category,
          group: fallbackProgram.group,
          focus: fallbackProgram.focus,
        },
  );

  await saveRotationCalendar(nextCalendar, nextOverrides);
}

export async function deleteProgramDefinition(programId: string) {
  const supabase = createAdminSupabaseClient();
  const bootstrap = await getProgrammingStudioBootstrap();
  const targetProgram = bootstrap.programs.find((program) => program.id === programId);

  if (targetProgram?.kind === "system") {
    throw new Error(
      "System/core programs are protected. Duplicate the program first if you want a removable custom version.",
    );
  }

  const remainingPrograms = bootstrap.programs.filter((program) => program.id !== programId);

  if (!remainingPrograms.length) {
    throw new Error("At least one program must remain.");
  }

  const fallbackProgram = remainingPrograms[0] ?? getProgramDefinition("strength");

  const nextCalendar = bootstrap.calendar.map((slot) =>
    slot.programId !== programId
      ? slot
      : {
          ...slot,
          programId: fallbackProgram.id,
          category: fallbackProgram.category,
          group: fallbackProgram.group,
          focus: fallbackProgram.focus,
        },
  );

  const nextOverrides = bootstrap.dateOverrides.map((override) =>
    override.programId !== programId
      ? override
      : {
          ...override,
          programId: fallbackProgram.id,
          category: fallbackProgram.category,
          group: fallbackProgram.group,
          focus: fallbackProgram.focus,
        },
  );

  const { data: deletedRow } = await supabase
    .from("workout_templates")
    .select("structure")
    .eq("slug", DELETED_PROGRAM_IDS_SLUG)
    .maybeSingle();
  const currentIds = ((deletedRow?.structure as { ids?: string[] } | null)?.ids ?? []);
  const nextIds = Array.from(new Set([...currentIds, programId]));

  const { error: deleteError } = await supabase
    .from("workout_templates")
    .delete()
    .eq("slug", programSlug(programId));
  if (deleteError) throw deleteError;

  await saveRotationCalendar(nextCalendar, nextOverrides);

  const { error: tombstoneError } = await supabase.from("workout_templates").upsert(
    {
      slug: DELETED_PROGRAM_IDS_SLUG,
      title: "Ravqen Deleted Program IDs",
      category: "System",
      focus: "Deleted program tombstones",
      estimated_duration_min: 0,
      is_active: true,
      structure: {
        kind: "deleted-program-ids",
        ids: nextIds,
        updated_for: currentSingaporeDateKey(),
      },
    },
    { onConflict: "slug" },
  );

  if (tombstoneError) {
    throw tombstoneError;
  }
}

export async function saveRotationCalendar(
  slots: RotationCalendarSlot[],
  dateOverrides: DateProgramOverride[],
) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("workout_templates").upsert(
    {
      slug: ROTATION_CALENDAR_SLUG,
      title: "Ravqen Rotation Calendar",
      category: "System",
      focus: "4-week rotation calendar",
      estimated_duration_min: 0,
      is_active: true,
      structure: {
        kind: "rotation-calendar",
        slots,
        dateOverrides,
        updated_for: currentSingaporeDateKey(),
      },
    },
    { onConflict: "slug" },
  );

  if (error) {
    throw error;
  }
}

export async function saveInternalExerciseLibrary(entries: InternalExerciseLibraryEntry[]) {
  const supabase = createAdminSupabaseClient();
  const normalizedEntries = normalizeInternalLibraryEntries(entries);
  const { error } = await supabase.from("workout_templates").upsert(
    {
      slug: INTERNAL_LIBRARY_SLUG,
      title: "Ravqen Internal Exercise Library",
      category: "System",
      focus: "Internal exercise library",
      estimated_duration_min: 0,
      is_active: true,
      structure: {
        kind: "internal-exercise-library",
        entries: normalizedEntries,
        updated_for: currentSingaporeDateKey(),
      },
    },
    { onConflict: "slug" },
  );

  if (error) {
    throw error;
  }
}

export async function getPersistedWorkoutForDate(date = new Date()): Promise<DailyWorkout> {
  try {
    const { programs, calendar, dateOverrides } = await getProgrammingStudioBootstrap();
    const dayLabel = currentSingaporeDayLabel(date);
    const dateKey = currentSingaporeDateKey(date);
    const weekIndex =
      getCurrentWeekScheduleSummary(date).find((entry) => entry.day === dayLabel)?.weekIndex ?? 0;
    const override = dateOverrides.find((item) => item.date === dateKey);
    const slot = override ??
      calendar.find((item) => item.day === dayLabel && item.weekIndex === weekIndex);
    const selectedProgram = programs.find((program) => program.id === slot?.programId);

    if (!selectedProgram) {
      return getWorkoutForProgram("strength", dayLabel);
    }

    return resolveYmoveMedia(workoutFromProgramDefinition(selectedProgram, dayLabel));
  } catch {
    return getWorkoutForProgram("strength", currentSingaporeDayLabel(date));
  }
}

export async function getPersistedWorkoutForProgram(
  programId: ProgramId,
  dayLabel: string,
): Promise<DailyWorkout> {
  try {
    const { programs } = await getProgrammingStudioBootstrap();
    const selectedProgram = programs.find((program) => program.id === programId);

    if (!selectedProgram) {
      return getWorkoutForProgram(programId, dayLabel);
    }

    return resolveYmoveMedia(workoutFromProgramDefinition(selectedProgram, dayLabel));
  } catch {
    return getWorkoutForProgram(programId, dayLabel);
  }
}

export async function getPersistedCurrentWeekSchedule(date = new Date()) {
  try {
    const { calendar, dateOverrides } = await getProgrammingStudioBootstrap();
    const currentWeek = getCurrentWeekScheduleSummary(date);
    const weekIndex = currentWeek[0]?.weekIndex ?? 0;
    const todayLocal = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    const current = new Date(`${todayLocal}T00:00:00+08:00`);
    const weekday = current.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);

    return calendar
      .filter((slot) => slot.weekIndex === weekIndex)
      .map((slot, index) => {
        const slotDate = new Date(monday);
        slotDate.setDate(monday.getDate() + index);
        const dateKey = currentSingaporeDateKey(slotDate);
        const override = dateOverrides.find((item) => item.date === dateKey);

        return {
          ...slot,
          date: dateKey,
          programId: override?.programId ?? slot.programId,
          category: override?.category ?? slot.category,
          group: override?.group ?? slot.group,
          focus: override?.focus ?? slot.focus,
          isOverride: Boolean(override),
        };
      });
  } catch {
    return getRotationCalendarSlots().filter((slot) => slot.weekIndex === 0);
  }
}

export { programSlug, ROTATION_CALENDAR_SLUG, INTERNAL_LIBRARY_SLUG, DELETED_PROGRAM_IDS_SLUG };
