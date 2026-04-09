"use client";

import type { ReactNode } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { DemoMedia } from "@/components/demo-media";
import {
  getStarterExerciseDefaults,
  inferPrescriptionType,
} from "@/lib/coaching-framework";
import { canonicalExerciseNames } from "@/lib/exercise-catalog";
import {
  EQUIPMENT_SUBCATEGORIES,
  MUSCLE_SUBCATEGORIES,
  SESSION_USAGE_OPTIONS,
  TYPE_SUBCATEGORIES,
  inferExerciseTaxonomy,
  type ExerciseEquipmentCategory,
  type ExerciseMuscleCategory,
  type ExerciseSessionUsage,
  type ExerciseTypeCategory,
} from "@/lib/exercise-taxonomy";
import {
  type DateProgramOverride,
  getCurrentWeekScheduleSummary,
  type InternalExerciseLibraryEntry,
  type ProgramDefinition,
  type ProgramTimelineItem,
  type RotationCalendarSlot,
  workoutFromProgramDefinition,
} from "@/lib/program-editor-data";
import {
  DEFAULT_PROGRAM_GROUPS,
  getProgramForWeekday,
  type ProgramGroup,
} from "@/lib/program-catalog";
import type { ExercisePrescriptionType } from "@/lib/types";

type GroupedPrograms = {
  group: ProgramGroup;
  programs: ProgramDefinition[];
};

const TIMELINE_SECTIONS: ProgramTimelineItem["section"][] = [
  "Warm-up",
  "Main session",
  "Cool-down",
];

type ExerciseLibraryItem = {
  id: string;
  sourceType: "internal" | "ymove" | "external";
  section: ProgramTimelineItem["section"];
  exerciseName: string;
  equipment: string;
  demoSummary: string;
  mediaSrc: string;
  previewMediaSrc?: string;
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
  ymoveExerciseId?: string;
  ymoveExerciseSlug?: string;
};

function slugifyMediaName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildLocalMediaPath(programId: string, exerciseName: string) {
  return `/exercise-media/${programId}/${slugifyMediaName(exerciseName)}.mp4`;
}

function getLibraryDraftDefaults(
  programId: string,
  section: ProgramTimelineItem["section"],
  targetLabel: string,
  exerciseName = "",
) {
  const prescriptionType = inferPrescriptionType(targetLabel);
  const starterDefaults = getStarterExerciseDefaults({
    programId,
    section,
    prescriptionType,
    targetLabel,
    exerciseName,
  });

  return {
    durationSec: starterDefaults.durationSec,
    restSec: starterDefaults.restSec,
    cycles: starterDefaults.cycles,
    prescriptionType,
  };
}

function getNextDraftWithStarterDefaults(
  current: InternalExerciseLibraryEntry,
  overrides: Partial<InternalExerciseLibraryEntry>,
  programId: string,
) {
  const next = { ...current, ...overrides };
  const targetLabel = `${next.targetValue} ${next.unit}`.trim();

  return {
    ...next,
    ...getLibraryDraftDefaults(programId, next.section, targetLabel, next.exerciseName),
  };
}

type ProgramStudioProps = {
  mode: "schedule" | "library" | "exercise-bank";
  initialPrograms: ProgramDefinition[];
  initialCalendar: RotationCalendarSlot[];
  initialInternalLibrary: InternalExerciseLibraryEntry[];
  initialDateOverrides: DateProgramOverride[];
  saveProgramAction: (
    program: ProgramDefinition,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  archiveProgramAction: (
    programId: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  deleteProgramAction: (
    programId: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  saveCalendarAction: (
    input: {
      slots: RotationCalendarSlot[];
      dateOverrides: DateProgramOverride[];
    },
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  saveInternalLibraryAction: (
    entries: InternalExerciseLibraryEntry[],
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
};

export function ProgramStudio({
  mode,
  initialPrograms,
  initialCalendar,
  initialInternalLibrary,
  initialDateOverrides,
  saveProgramAction,
  archiveProgramAction,
  deleteProgramAction,
  saveCalendarAction,
  saveInternalLibraryAction,
}: ProgramStudioProps) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [calendarSlots, setCalendarSlots] = useState(initialCalendar);
  const [internalLibrary, setInternalLibrary] = useState(initialInternalLibrary);
  const [dateOverrides, setDateOverrides] = useState(initialDateOverrides);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    initialPrograms[0]?.id ?? "strength",
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string>(initialCalendar[0]?.id ?? "");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingProgram, setIsSavingProgram] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [librarySection, setLibrarySection] =
    useState<ProgramTimelineItem["section"]>("Main session");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [pickerLibraryQueryInput, setPickerLibraryQueryInput] = useState("");
  const [pickerLibraryQuery, setPickerLibraryQuery] = useState("");
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState<ExerciseMuscleCategory | "all">("all");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<ExerciseTypeCategory | "all">("all");
  const [libraryEquipmentFilter, setLibraryEquipmentFilter] = useState<ExerciseEquipmentCategory | "all">("all");
  const [libraryView, setLibraryView] = useState<"timeline" | "picker">("timeline");
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);
  const [previewItem, setPreviewItem] = useState<ExerciseLibraryItem | null>(null);
  const [replaceExerciseFrom, setReplaceExerciseFrom] = useState("");
  const [replaceExerciseTo, setReplaceExerciseTo] = useState("");
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramGroup, setNewProgramGroup] = useState<ProgramGroup>("Resistance training");
  const [newProgramFocus, setNewProgramFocus] = useState("");
  const [newProgramScienceNote, setNewProgramScienceNote] = useState("");
  const [renameTrainingGroup, setRenameTrainingGroup] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [libraryDraft, setLibraryDraft] = useState<InternalExerciseLibraryEntry>({
    id: `library-${crypto.randomUUID()}`,
    section: "Main session",
    exerciseName: "",
    mediaSourceType: "internal",
    equipment: "",
    demoSummary: "",
    mediaSrc: "/exercise-media/bodyweight-squat.svg",
    mediaAlt: "Exercise demo",
    targetValue: "10",
    unit: "reps",
    ...getLibraryDraftDefaults("strength", "Main session", "10 reps"),
    cues: [],
    tags: [],
    usageContexts: ["Main session"],
  });
  const [editingLibraryOriginalName, setEditingLibraryOriginalName] = useState<string | null>(null);
  const [isApplyPreviewOpen, setIsApplyPreviewOpen] = useState(false);

  const selectedProgram =
    programs.find((program) => program.id === selectedProgramId) ?? programs[0];
  const selectedSlot =
    calendarSlots.find((slot) => slot.id === selectedSlotId) ?? calendarSlots[0];
  const activeWeekIndex = getCurrentWeekScheduleSummary()[0]?.weekIndex ?? 0;
  const currentWeek = calendarSlots.filter((slot) => slot.weekIndex === activeWeekIndex);
  const calendarDays = useMemo(() => buildCalendarMonth(calendarMonth, dateOverrides), [
    calendarMonth,
    dateOverrides,
  ]);

  const groupedPrograms = useMemo<GroupedPrograms[]>(() => {
    const activePrograms = programs.filter((program) => program.status !== "archived");
    const existingGroups = Array.from(new Set(activePrograms.map((program) => program.group)));
    const orderedGroups: ProgramGroup[] = [
      ...DEFAULT_PROGRAM_GROUPS.filter((group) => existingGroups.includes(group)),
      ...existingGroups.filter(
        (group) =>
          !DEFAULT_PROGRAM_GROUPS.includes(group as (typeof DEFAULT_PROGRAM_GROUPS)[number]),
      ),
    ];

    return orderedGroups
      .map((group) => ({
        group,
        programs: activePrograms.filter((program) => program.group === group),
      }))
      .filter((group) => group.programs.length > 0);
  }, [programs]);

  const archivedPrograms = useMemo(
    () => programs.filter((program) => program.status === "archived"),
    [programs],
  );

  const uniqueExerciseNames = useMemo(
    () =>
      Array.from(
        new Set(
          internalLibrary
            .filter((item) => item.status !== "archived")
            .map((item) => item.exerciseName),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [internalLibrary],
  );
  const programGroupOptions = useMemo(
    () =>
      Array.from(new Set([...DEFAULT_PROGRAM_GROUPS, ...programs.map((program) => program.group)])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [programs],
  );

  const simulationWorkout = useMemo(
    () => workoutFromProgramDefinition(selectedProgram, "Simulation"),
    [selectedProgram],
  );
  const editingLibraryEntry = useMemo(
    () => internalLibrary.find((entry) => entry.id === libraryDraft.id),
    [internalLibrary, libraryDraft.id],
  );
  const activeInternalLibraryCount = useMemo(
    () => internalLibrary.filter((entry) => entry.status !== "archived").length,
    [internalLibrary],
  );
  const activeFilterCount = useMemo(
    () =>
      [
        libraryMuscleFilter !== "all",
        libraryTypeFilter !== "all",
        libraryEquipmentFilter !== "all",
        Boolean(libraryQuery.trim()),
      ].filter(Boolean).length,
    [libraryEquipmentFilter, libraryMuscleFilter, libraryQuery, libraryTypeFilter],
  );

  const timelineSections = useMemo(
    () =>
      TIMELINE_SECTIONS.map((section) => ({
        section,
        items: selectedProgram.timeline.filter((item) => item.section === section),
      })),
    [selectedProgram],
  );

  const libraryItemsForSection = useMemo<ExerciseLibraryItem[]>(
    () =>
      internalLibrary
        .filter((item) => item.status !== "archived")
        .filter((item) => (item.usageContexts ?? [item.section]).includes(librarySection))
        .filter((item) => {
          const activeQuery =
            mode === "library" && libraryView === "picker"
              ? pickerLibraryQuery
              : libraryQuery;
          const query = activeQuery.trim().toLowerCase();
          const matchesQuery =
            !query ||
            item.exerciseName.toLowerCase().includes(query) ||
            item.equipment.toLowerCase().includes(query) ||
            (item.tags ?? []).some((tag) => tag.toLowerCase().includes(query));
          const matchesMuscle =
            libraryMuscleFilter === "all" || item.muscleCategory === libraryMuscleFilter;
          const matchesType =
            libraryTypeFilter === "all" || item.typeCategory === libraryTypeFilter;
          const matchesEquipment =
            libraryEquipmentFilter === "all" || item.equipmentCategory === libraryEquipmentFilter;
          const matchesUsage =
            (item.usageContexts ?? [item.section]).includes(librarySection);

          return (
            matchesQuery &&
            matchesMuscle &&
            matchesType &&
            matchesEquipment &&
            matchesUsage
          );
        })
        .map((item) => ({
          id: item.id,
          sourceType: item.mediaSourceType,
          section: item.section,
          exerciseName: item.exerciseName,
          equipment: item.equipment,
          demoSummary: item.demoSummary,
          mediaSrc: item.mediaSrc,
          previewMediaSrc: item.mediaSrc,
          mediaAlt: item.mediaAlt,
          targetValue: item.targetValue,
          unit: item.unit,
          cycles: item.cycles,
          restSec: item.restSec,
          durationSec: item.durationSec,
          prescriptionType: item.prescriptionType,
          coachingNote: item.coachingNote,
          cues: item.cues,
          tags: item.tags ?? [],
          muscleCategory: item.muscleCategory,
          typeCategory: item.typeCategory,
          equipmentCategory: item.equipmentCategory,
          usageContexts: item.usageContexts ?? [item.section],
        })),
    [
      internalLibrary,
      libraryQuery,
      pickerLibraryQuery,
      mode,
      libraryView,
      librarySection,
      libraryMuscleFilter,
      libraryTypeFilter,
      libraryEquipmentFilter,
    ],
  );
  const exerciseUsageMap = useMemo(() => {
    const usage = new Map<string, Set<string>>();

    for (const program of programs) {
      for (const item of program.timeline) {
        const current = usage.get(item.exerciseName) ?? new Set<string>();
        current.add(program.id);
        usage.set(item.exerciseName, current);
      }
    }

    return new Map(Array.from(usage.entries()).map(([name, ids]) => [name, ids.size]));
  }, [programs]);
  const exerciseUsageProgramsMap = useMemo(() => {
    const usage = new Map<string, Array<{ id: string; category: string; group: string }>>();

    for (const program of programs) {
      for (const item of program.timeline) {
        const current = usage.get(item.exerciseName) ?? [];
        if (!current.some((entry) => entry.id === program.id)) {
          current.push({
            id: program.id,
            category: program.category,
            group: program.group,
          });
        }
        usage.set(item.exerciseName, current);
      }
    }

    return usage;
  }, [programs]);

  if (!selectedProgram || !selectedSlot) {
    return null;
  }

  const isScheduleMode = mode === "schedule";
  const isLibraryMode = mode === "library";
  const isExerciseBankMode = mode === "exercise-bank";

  const updateTimelineItem = (
    programId: string,
    itemId: string,
    updates: Partial<ProgramDefinition["timeline"][number]>,
  ) => {
    setPrograms((current) =>
      current.map((program) =>
        program.id !== programId
          ? program
          : {
              ...program,
              timeline: program.timeline.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item,
              ),
            },
      ),
    );
  };

  const moveTimelineItem = (programId: string, draggedItemId: string, targetItemId: string) => {
    setPrograms((current) =>
      current.map((program) => {
        if (program.id !== programId) {
          return program;
        }

        const items = [...program.timeline];
        const draggedIndex = items.findIndex((item) => item.id === draggedItemId);
        const targetIndex = items.findIndex((item) => item.id === targetItemId);

        if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
          return program;
        }

        const [moved] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, moved);

        return {
          ...program,
          timeline: items,
        };
      }),
    );
  };

  const assignSelectedProgramToSlot = () => {
    setSaveError(null);
    setSaveMessage(null);
    setCalendarSlots((current) =>
      current.map((slot) =>
        slot.id !== selectedSlot.id
          ? slot
          : {
              ...slot,
              programId: selectedProgram.id,
              category: selectedProgram.category,
              group: selectedProgram.group,
              focus: selectedProgram.focus,
            },
      ),
    );
  };

  const addExerciseToProgram = (item: ExerciseLibraryItem) => {
    const targetSection = librarySection;
    const newItem: ProgramTimelineItem = {
      id: `${selectedProgram.id}-${targetSection.toLowerCase().replace(/\s+/g, "-")}-${crypto.randomUUID()}`,
      section: targetSection,
      blockTitle: targetSection === "Main session" ? "Main session" : targetSection,
      exerciseName: item.exerciseName,
      mediaSourceType: item.sourceType,
      equipment: item.equipment,
      demoSummary: item.demoSummary,
      mediaSrc:
        item.sourceType === "ymove" ? "/exercise-media/transition-rest.svg" : item.mediaSrc,
      mediaAlt: item.mediaAlt,
      prescriptionType: item.prescriptionType,
      coachingNote: item.coachingNote,
      cycles: item.cycles,
      targetValue: item.targetValue,
      unit: item.unit,
      restSec: item.restSec,
      durationSec: item.durationSec,
      cues: item.cues,
      tags: item.tags ?? [],
      muscleCategory: item.muscleCategory,
      typeCategory: item.typeCategory,
      equipmentCategory: item.equipmentCategory,
      usageContexts: item.usageContexts ?? [targetSection],
      ymoveExerciseId: item.ymoveExerciseId,
      ymoveExerciseSlug: item.ymoveExerciseSlug,
    };

    setPrograms((current) =>
      current.map((program) => {
        if (program.id !== selectedProgram.id) {
          return program;
        }

        const nextTimeline = [...program.timeline];
        const insertAfterIndex = Math.max(
          ...nextTimeline
            .map((timelineItem, index) => (timelineItem.section === targetSection ? index : -1))
            .filter((index) => index >= 0),
          -1,
        );

        nextTimeline.splice(insertAfterIndex + 1, 0, newItem);

        return {
          ...program,
          timeline: nextTimeline,
        };
      }),
    );

    setLibraryView("timeline");
    setSaveError(null);
    setSaveMessage(`${item.exerciseName} added to ${selectedProgram.category} in ${targetSection.toLowerCase()}.`);

    requestAnimationFrame(() => {
      document.getElementById(newItem.id)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const removeTimelineItem = (itemId: string) => {
    setPrograms((current) =>
      current.map((program) =>
        program.id !== selectedProgram.id
          ? program
          : {
              ...program,
              timeline: program.timeline.filter((item) => item.id !== itemId),
            },
      ),
    );
  };

  const replaceExerciseAcrossPrograms = () => {
    const from = replaceExerciseFrom.trim();
    const to = replaceExerciseTo.trim();

    if (!from || !to) {
      setSaveError("Both swap fields are required.");
      return;
    }

    setPrograms((current) =>
      current.map((program) => ({
        ...program,
        timeline: program.timeline.map((item) =>
          item.exerciseName !== from
            ? item
            : {
                ...item,
                exerciseName: to,
              },
        ),
      })),
    );
    setSaveError(null);
    setSaveMessage(`Replaced ${from} with ${to} across loaded programs. Save affected programs next.`);
  };

  const resetLibraryDraft = (section: ProgramTimelineItem["section"] = librarySection) => {
    setEditingLibraryOriginalName(null);
    setLibraryDraft({
      id: `library-${crypto.randomUUID()}`,
      section,
      exerciseName: "",
      mediaSourceType: "internal",
      equipment: "",
      demoSummary: "",
      mediaSrc: "/exercise-media/bodyweight-squat.svg",
      mediaAlt: "Exercise demo",
      targetValue: section === "Main session" ? "10" : "steady",
      unit: section === "Main session" ? "reps" : "seconds",
      ...getLibraryDraftDefaults(
        selectedProgram.id,
        section,
        section === "Main session" ? "10 reps" : "steady seconds",
      ),
      cues: [],
      tags: [],
      ...inferExerciseTaxonomy({
        exerciseName: "",
        equipment: "",
        section,
      }),
      usageContexts: [section],
      status: "active",
    });
  };

  const saveLibraryEntry = () => {
    if (!libraryDraft.exerciseName.trim()) {
      setSaveError("Internal library exercise name is required.");
      return;
    }

    const nextEntry = {
      ...libraryDraft,
      cues: libraryDraft.cues,
      usageContexts:
        libraryDraft.usageContexts?.length ? libraryDraft.usageContexts : [libraryDraft.section],
      status: libraryDraft.status ?? "active",
    };

    setInternalLibrary((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === libraryDraft.id);
      if (existingIndex >= 0) {
        return current.map((entry, index) => (index === existingIndex ? nextEntry : entry));
      }

      return [...current, nextEntry];
    });
    resetLibraryDraft(librarySection);
    setSaveError(null);
    setSaveMessage(
      internalLibrary.some((entry) => entry.id === libraryDraft.id)
        ? "Exercise changes staged in the internal library."
        : "Exercise added to internal library.",
    );
  };

  const applyExerciseChangesToLinkedPrograms = () => {
    const sourceExerciseName = editingLibraryOriginalName ?? libraryDraft.exerciseName;
    const linkedPrograms = programs.filter((program) =>
      program.timeline.some((item) => item.exerciseName === sourceExerciseName),
    );

    if (!linkedPrograms.length) {
      setSaveError("This exercise is not linked to any programs yet.");
      return;
    }

    const nextPrograms = programs.map((program) => ({
      ...program,
      timeline: program.timeline.map((item) =>
        item.exerciseName !== sourceExerciseName
          ? item
          : {
              ...item,
              exerciseName: libraryDraft.exerciseName,
              equipment: libraryDraft.equipment,
              demoSummary: libraryDraft.demoSummary,
              mediaSrc: libraryDraft.mediaSrc,
              mediaAlt: libraryDraft.mediaAlt,
              prescriptionType: libraryDraft.prescriptionType,
              coachingNote: libraryDraft.coachingNote,
              targetValue: libraryDraft.targetValue,
              unit: libraryDraft.unit,
              cycles: libraryDraft.cycles,
              restSec: libraryDraft.restSec,
              durationSec: libraryDraft.durationSec,
              cues: libraryDraft.cues,
              tags: libraryDraft.tags ?? [],
              muscleCategory: libraryDraft.muscleCategory,
              typeCategory: libraryDraft.typeCategory,
              equipmentCategory: libraryDraft.equipmentCategory,
              usageContexts: libraryDraft.usageContexts ?? [libraryDraft.section],
            },
      ),
    }));

    setSaveError(null);
    setSaveMessage(null);
    setIsSavingProgram(true);

    startTransition(async () => {
      const affectedProgramIds = new Set(linkedPrograms.map((program) => program.id));
      const affectedPrograms = nextPrograms.filter((program) => affectedProgramIds.has(program.id));
      const results = await Promise.all(
        affectedPrograms.map((program) => saveProgramAction(program)),
      );
      const failed = results.find((result) => !result.ok);

      if (failed && !failed.ok) {
        setSaveError(failed.message);
        setIsSavingProgram(false);
        return;
      }

      setPrograms(nextPrograms);
      setEditingLibraryOriginalName(libraryDraft.exerciseName);
      setSaveMessage(
        `Applied ${libraryDraft.exerciseName} updates across ${linkedPrograms.length} linked program${linkedPrograms.length === 1 ? "" : "s"}.`,
      );
      setIsSavingProgram(false);
    });
  };

  const linkedProgramsForDraft =
    exerciseUsageProgramsMap.get(editingLibraryOriginalName ?? libraryDraft.exerciseName) ?? [];
  const changedLinkedFields: Array<{ label: string; before: string; after: string }> =
    editingLibraryEntry
      ? ([
          ["Exercise name", editingLibraryEntry.exerciseName, libraryDraft.exerciseName],
          ["Equipment", editingLibraryEntry.equipment, libraryDraft.equipment],
          ["Demo summary", editingLibraryEntry.demoSummary, libraryDraft.demoSummary],
          ["Media URL", editingLibraryEntry.mediaSrc, libraryDraft.mediaSrc],
          ["Target", editingLibraryEntry.targetValue, libraryDraft.targetValue],
          ["Unit", editingLibraryEntry.unit, libraryDraft.unit],
          ["Cycles", String(editingLibraryEntry.cycles), String(libraryDraft.cycles)],
          ["Rest", `${editingLibraryEntry.restSec}s`, `${libraryDraft.restSec}s`],
          ["Work cap", `${editingLibraryEntry.durationSec}s`, `${libraryDraft.durationSec}s`],
          ["Coaching note", editingLibraryEntry.coachingNote ?? "", libraryDraft.coachingNote ?? ""],
        ] as const)
          .filter(([, before, after]) => (before ?? "") !== (after ?? ""))
          .map(([label, before, after]) => ({
            label,
            before: before || "Empty",
            after: after || "Empty",
          }))
      : [];

  const archiveLibraryEntry = () => {
    const targetId = libraryDraft.id;
    const existing = internalLibrary.find((entry) => entry.id === targetId);
    if (!existing) {
      setSaveError("Load an existing library exercise before archiving it.");
      return;
    }

    setInternalLibrary((current) =>
      current.map((entry) =>
        entry.id === targetId ? { ...entry, status: "archived" as const } : entry,
      ),
    );
    resetLibraryDraft(librarySection);
    setSaveError(null);
    setSaveMessage(`${existing.exerciseName} archived from the internal library.`);
  };

  const duplicateSelectedProgram = () => {
    const nextId = `${selectedProgram.id}-${crypto.randomUUID().slice(0, 8)}`;
    const nextProgram: ProgramDefinition = {
      ...selectedProgram,
      id: nextId,
      category: `${selectedProgram.category} Copy`,
      kind: "custom",
      status: "active",
      timeline: selectedProgram.timeline.map((item, index) => ({
        ...item,
        id: `${nextId}-${slugifyMediaName(item.section)}-${index + 1}-${crypto.randomUUID().slice(0, 6)}`,
      })),
    };

    setPrograms((current) => [...current, nextProgram]);
    setSelectedProgramId(nextProgram.id);
    setSaveError(null);
    setSaveMessage(`${selectedProgram.category} duplicated. Save the copy when you are ready.`);
  };

  const archiveSelectedProgram = () => {
    setSaveError(null);
    setSaveMessage(null);
    setIsSavingProgram(true);

    startTransition(async () => {
      const result = await archiveProgramAction(selectedProgram.id);

      if (!result.ok) {
        setSaveError(result.message);
        setIsSavingProgram(false);
        return;
      }

      const nextPrograms = programs.map((program) =>
        program.id === selectedProgram.id ? { ...program, status: "archived" as const } : program,
      );
      setPrograms(nextPrograms);
      const fallbackProgram =
        nextPrograms.find((program) => program.status !== "archived") ?? nextPrograms[0];
      if (fallbackProgram) {
        setSelectedProgramId(fallbackProgram.id);
      }
      setSaveMessage(`${selectedProgram.category} archived.`);
      setIsSavingProgram(false);
    });
  };

  const exportDataSnapshot = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      programs,
      calendarSlots,
      dateOverrides,
      internalLibrary,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ravqen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveError(null);
    setSaveMessage("Backup snapshot exported.");
  };

  const persistInternalLibrary = () => {
    setSaveError(null);
    setSaveMessage(null);
    setIsSavingLibrary(true);

    startTransition(async () => {
      const result = await saveInternalLibraryAction(internalLibrary);

      if (!result.ok) {
        setSaveError(result.message);
        setIsSavingLibrary(false);
        return;
      }

      setSaveMessage("Internal exercise library saved.");
      setIsSavingLibrary(false);
    });
  };

  const persistSelectedProgram = () => {
    setSaveError(null);
    setSaveMessage(null);
    setIsSavingProgram(true);

    startTransition(async () => {
      const result = await saveProgramAction(selectedProgram);

      if (!result.ok) {
        setSaveError(result.message);
        setIsSavingProgram(false);
        return;
      }

      setSaveMessage(`${selectedProgram.category} saved to Ravqen.`);
      setIsSavingProgram(false);
    });
  };

  const deleteSelectedProgram = () => {
    if (programs.length <= 1) {
      setSaveError("At least one program must remain.");
      return;
    }

    const targetProgram = selectedProgram;
    const fallbackProgram =
      programs.find((program) => program.id !== targetProgram.id) ?? programs[0];

    setSaveError(null);
    setSaveMessage(null);
    setIsSavingProgram(true);

    startTransition(async () => {
      const result = await deleteProgramAction(targetProgram.id);

      if (!result.ok) {
        setSaveError(result.message);
        setIsSavingProgram(false);
        return;
      }

      setPrograms((current) => current.filter((program) => program.id !== targetProgram.id));
      setSelectedProgramId(fallbackProgram.id);
      setSaveMessage(`${targetProgram.category} deleted.`);
      setIsSavingProgram(false);
    });
  };

  const renameTrainingGroupEverywhere = () => {
    const currentGroup = selectedProgram.group.trim();
    const nextGroup = renameTrainingGroup.trim();

    if (!currentGroup) {
      setSaveError("Current training group is empty.");
      return;
    }

    if (!nextGroup) {
      setSaveError("New training group name is required.");
      return;
    }

    if (nextGroup === currentGroup) {
      setSaveError("Choose a different training group name.");
      return;
    }

    const affectedPrograms = programs.filter((program) => program.group === currentGroup);
    if (!affectedPrograms.length) {
      setSaveError("No programs matched that training group.");
      return;
    }

    const updatedPrograms = affectedPrograms.map((program) => ({
      ...program,
      group: nextGroup,
    }));

    setSaveError(null);
    setSaveMessage(null);
    setIsSavingProgram(true);

    startTransition(async () => {
      const results = await Promise.all(
        updatedPrograms.map((program) => saveProgramAction(program)),
      );

      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok) {
        setSaveError(failed.message);
        setIsSavingProgram(false);
        return;
      }

      setPrograms((current) =>
        current.map((program) =>
          program.group === currentGroup ? { ...program, group: nextGroup } : program,
        ),
      );
      setRenameTrainingGroup("");
      setSaveMessage(
        `Renamed ${currentGroup} to ${nextGroup} across ${updatedPrograms.length} program${updatedPrograms.length === 1 ? "" : "s"}.`,
      );
      setIsSavingProgram(false);
    });
  };

  const persistCalendar = () => {
    setSaveError(null);
    setSaveMessage(null);
    setIsSavingCalendar(true);

    startTransition(async () => {
      const result = await saveCalendarAction({
        slots: calendarSlots,
        dateOverrides,
      });

      if (!result.ok) {
        setSaveError(result.message);
        setIsSavingCalendar(false);
        return;
      }

      setSaveMessage("Rotation calendar saved.");
      setIsSavingCalendar(false);
    });
  };

  const applyDateOverride = () => {
    if (!selectedDate) {
      setSaveError("Select a date in the calendar first.");
      return;
    }

    setDateOverrides((current) => {
      const nextOverride: DateProgramOverride = {
        id: `override-${selectedDate}`,
        date: selectedDate,
        programId: selectedProgram.id,
        category: selectedProgram.category,
        group: selectedProgram.group,
        focus: selectedProgram.focus,
      };

      const remaining = current.filter((item) => item.date !== selectedDate);
      return [...remaining, nextOverride].sort((a, b) => a.date.localeCompare(b.date));
    });
    setSaveMessage("Date override staged. Save rotation calendar to persist it.");
    setSaveError(null);
  };

  const clearDateOverride = () => {
    if (!selectedDate) {
      return;
    }

    setDateOverrides((current) => current.filter((item) => item.date !== selectedDate));
    setSaveMessage("Date override removed. Save rotation calendar to persist it.");
    setSaveError(null);
  };

  const createNewProgram = () => {
    const category = newProgramName.trim();
    if (!category) {
      setSaveError("Program name is required.");
      return;
    }

    const nextId = slugifyMediaName(category);
    if (!nextId) {
      setSaveError("Program name needs letters or numbers.");
      return;
    }

    if (programs.some((program) => program.id === nextId || program.category.toLowerCase() === category.toLowerCase())) {
      setSaveError("A program with that name already exists.");
      return;
    }

    const nextProgram: ProgramDefinition = {
      id: nextId,
      group: newProgramGroup,
      category,
      focus: newProgramFocus.trim() || "New Ravqen session ready for programming.",
      scienceNote:
        newProgramScienceNote.trim() ||
        "Program draft created. Add a warm-up, main session, and cool-down before saving.",
      estimatedDurationMin: 60,
      status: "active",
      kind: "custom",
      timeline: [],
    };

    setPrograms((current) => [...current, nextProgram]);
    setSelectedProgramId(nextProgram.id);
    setLibraryView("timeline");
    setIsCreatingProgram(false);
    setNewProgramName("");
    setNewProgramGroup("Resistance training");
    setNewProgramFocus("");
    setNewProgramScienceNote("");
    setSaveError(null);
    setSaveMessage(`${nextProgram.category} created. Add timeline items, then save program changes.`);
  };

  const loadLibraryItemIntoEditor = (item: ExerciseLibraryItem) => {
    setLibrarySection(item.section);
    setEditingLibraryOriginalName(item.exerciseName);
    setPreviewItem({
      ...item,
      previewMediaSrc: item.previewMediaSrc ?? item.mediaSrc,
    });
    setLibraryDraft((current) => ({
      ...current,
      id: item.id,
      section: item.section,
      exerciseName: item.exerciseName,
      mediaSourceType:
        item.sourceType === "ymove" ? "external" : item.sourceType,
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
    setSaveMessage(`${item.exerciseName} loaded into the editor below.`);
    setSaveError(null);

    requestAnimationFrame(() => {
      document.getElementById("internal-library-editor")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">Program studio</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {isScheduleMode
              ? "Current snapshot and calendar assignment"
              : isLibraryMode
                ? "Programs and exercise picker"
                : "Internal exercise library"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-300">
            {isScheduleMode
              ? "Review the active weekly rotation, assign programs into the rolling calendar, and stage one-off date overrides when you need them."
              : isLibraryMode
                ? "Choose a training category, open a program, and work only on the coaching information that matters for building the session."
                : "Manage the reusable exercise bank, media sources, taxonomy tags, and future exercise imports without cluttering the main program editor."}
          </p>
        </div>
        <div className="rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
          {isScheduleMode
            ? `${selectedProgram.category} selected for scheduling`
            : isLibraryMode
              ? `${selectedProgram.category} • ${selectedProgram.timeline.length} timeline items`
              : `${internalLibrary.length} library exercises`}
        </div>
      </div>

      {isScheduleMode ? (
        <div className="mt-5 rounded-[1.75rem] border border-white/8 bg-[#091317] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Current week</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Active rotation snapshot</h3>
            </div>
            <p className="max-w-xl text-sm leading-7 text-stone-300">
              The player reads from the current week schedule, so the session changes across the
              block instead of always repeating the same Monday program.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {currentWeek.map((slot) => (
              <div
                key={`${slot.weekIndex}-${slot.day}`}
                className="rounded-[1.35rem] border border-white/8 bg-white/4 p-3"
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">{slot.day}</p>
                <p className="mt-2 text-sm font-semibold text-white">{slot.category}</p>
                <p className="mt-1 text-xs text-cyan-100">{slot.group}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`mt-5 grid gap-4 ${isExerciseBankMode ? "" : "xl:grid-cols-[0.8fr_1.2fr]"}`}>
        {!isExerciseBankMode ? (
        <div className="space-y-4">
          {groupedPrograms.map((group) => (
            <div
              key={group.group}
              className="rounded-[1.5rem] border border-white/8 bg-[#091317] p-3"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">{group.group}</p>
              <div className="mt-3 space-y-2">
                {group.programs.map((program) => {
                  const active = program.id === selectedProgram.id;

                  return (
                    <button
                      key={program.id}
                      type="button"
                      onClick={() => setSelectedProgramId(program.id)}
                      className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
                        active
                          ? "border-cyan-300/40 bg-cyan-300/10"
                          : "border-white/8 bg-white/4 hover:bg-white/7"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{program.category}</p>
                      <p className="mt-1 text-xs text-stone-400">{program.focus}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                        {program.estimatedDurationMin} min total
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {archivedPrograms.length ? (
            <div className="rounded-[1.5rem] border border-amber-300/12 bg-[#091317] p-3">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100">Archived programs</p>
              <div className="mt-3 space-y-2">
                {archivedPrograms.map((program) => {
                  const active = program.id === selectedProgram.id;

                  return (
                    <button
                      key={program.id}
                      type="button"
                      onClick={() => setSelectedProgramId(program.id)}
                      className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
                        active
                          ? "border-amber-300/35 bg-amber-300/10"
                          : "border-white/8 bg-white/4 hover:bg-white/7"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{program.category}</p>
                          <p className="mt-1 text-xs text-stone-400">{program.focus}</p>
                        </div>
                        <StatusBadge label="archived" tone="amber" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        ) : null}

        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-white/8 bg-[#091317] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">
                  {isExerciseBankMode ? "Internal exercise library" : selectedProgram.group}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {isExerciseBankMode ? "Exercise library" : selectedProgram.category}
                </h3>
                <p className="mt-2 text-sm leading-7 text-stone-300">
                  {isExerciseBankMode
                    ? "Search and filter the full exercise bank, then maintain exercise details without mixing it up with program editing."
                    : selectedProgram.focus}
                </p>
                {!isExerciseBankMode ? (
                  <p className="mt-2 text-xs leading-6 text-cyan-100">
                    Science note: {selectedProgram.scienceNote}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                {isScheduleMode ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={exportDataSnapshot}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Export snapshot
                    </button>
                    <button
                      type="button"
                      onClick={persistCalendar}
                      disabled={isSavingCalendar}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isSavingCalendar ? "Saving calendar..." : "Save Rotation Calendar"}
                    </button>
                  </div>
                ) : null}
                {isLibraryMode ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingProgram((value) => !value)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
                    >
                      {isCreatingProgram ? "Close new program" : "New program"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLibraryView("picker");
                        setPickerLibraryQueryInput(libraryQuery);
                        setPickerLibraryQuery(libraryQuery.trim());
                      }}
                      className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                        libraryView === "picker"
                          ? "bg-cyan-300 text-slate-950"
                          : "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                      }`}
                    >
                      Add exercise
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryView("timeline")}
                      className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                        libraryView === "timeline"
                          ? "bg-cyan-300 text-slate-950"
                          : "border border-white/10 bg-white/5 text-white"
                      }`}
                    >
                      {libraryView === "picker" ? "Back to program" : "Program timeline"}
                    </button>
                    <button
                      type="button"
                      onClick={duplicateSelectedProgram}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSimulatorOpen(true)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Test session
                    </button>
                    <button
                      type="button"
                      onClick={exportDataSnapshot}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Export snapshot
                    </button>
                    <button
                      type="button"
                      onClick={persistSelectedProgram}
                      disabled={isSavingProgram}
                      className="rounded-full bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    >
                      {isSavingProgram ? "Saving program..." : "Save Program Changes"}
                    </button>
                  </div>
                ) : null}
                {isExerciseBankMode ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={exportDataSnapshot}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Export snapshot
                    </button>
                    <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                      {activeInternalLibraryCount} active exercises
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-end gap-2">
                    <StatusBadge label={selectedProgram.status ?? "active"} tone={selectedProgram.status === "archived" ? "amber" : "emerald"} />
                    <StatusBadge label={selectedProgram.kind ?? "custom"} tone={selectedProgram.kind === "system" ? "stone" : "cyan"} />
                    <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                      {selectedProgram.estimatedDurationMin} min total
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isLibraryMode && isCreatingProgram ? (
              <div className="mt-5 rounded-[1.35rem] border border-cyan-300/15 bg-cyan-300/8 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Create new program</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Program name">
                    <input
                      value={newProgramName}
                      onChange={(event) => setNewProgramName(event.target.value)}
                      placeholder="Example: Lower Body Builder"
                      className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                    />
                  </Field>
                  <Field label="Training group">
                    <input
                      list="program-group-options"
                      value={newProgramGroup}
                      onChange={(event) => setNewProgramGroup(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                      placeholder="Choose or type a new training group"
                    />
                  </Field>
                  <Field label="Program focus">
                    <textarea
                      rows={3}
                      value={newProgramFocus}
                      onChange={(event) => setNewProgramFocus(event.target.value)}
                      placeholder="Short description of what this session is trying to train."
                      className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                    />
                  </Field>
                  <Field label="Science note">
                    <textarea
                      rows={3}
                      value={newProgramScienceNote}
                      onChange={(event) => setNewProgramScienceNote(event.target.value)}
                      placeholder="Coach note explaining why this session is structured this way."
                      className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                    />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={createNewProgram}
                    className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Create program
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingProgram(false)}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {isLibraryMode ? (
              <div className="mt-5 rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
                {selectedProgram.status === "archived" ? (
                  <div className="mb-4 rounded-[1rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
                    This program is archived. It stays in the library for reference, but it should not be used for new calendar assignments.
                  </div>
                ) : null}
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Program details</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Program name">
                    <input
                      value={selectedProgram.category}
                      onChange={(event) =>
                        setPrograms((current) =>
                          current.map((program) =>
                            program.id !== selectedProgram.id
                              ? program
                              : { ...program, category: event.target.value },
                          ),
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                    />
                  </Field>
                  <Field label="Training group">
                    <input
                      list="program-group-options"
                      value={selectedProgram.group}
                      onChange={(event) =>
                        setPrograms((current) =>
                          current.map((program) =>
                            program.id !== selectedProgram.id
                              ? program
                              : { ...program, group: event.target.value },
                          ),
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                    />
                  </Field>
                  <Field label="Program focus">
                    <textarea
                      rows={3}
                      value={selectedProgram.focus}
                      onChange={(event) =>
                        setPrograms((current) =>
                          current.map((program) =>
                            program.id !== selectedProgram.id
                              ? program
                              : { ...program, focus: event.target.value },
                          ),
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                    />
                  </Field>
                  <Field label="Science note">
                    <textarea
                      rows={3}
                      value={selectedProgram.scienceNote}
                      onChange={(event) =>
                        setPrograms((current) =>
                          current.map((program) =>
                            program.id !== selectedProgram.id
                              ? program
                              : { ...program, scienceNote: event.target.value },
                          ),
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                    />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={persistSelectedProgram}
                    disabled={isSavingProgram}
                    className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                  >
                    {isSavingProgram ? "Saving..." : "Save program changes"}
                  </button>
                  <button
                    type="button"
                    onClick={archiveSelectedProgram}
                    disabled={isSavingProgram}
                    className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
                  >
                    Archive program
                  </button>
                  {selectedProgram.kind !== "system" ? (
                    <button
                      type="button"
                      onClick={deleteSelectedProgram}
                      disabled={isSavingProgram}
                      className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-60"
                    >
                      Permanently delete
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Rename training group everywhere</p>
                  <p className="mt-2 text-sm leading-6 text-stone-300">
                    Current group: <span className="font-semibold text-white">{selectedProgram.group}</span>
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <Field label="New training group name">
                      <input
                        list="program-group-options"
                        value={renameTrainingGroup}
                        onChange={(event) => setRenameTrainingGroup(event.target.value)}
                        placeholder="Type the new shared group name"
                        className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                      />
                    </Field>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={renameTrainingGroupEverywhere}
                        disabled={isSavingProgram}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Rename group
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isScheduleMode ? (
              <div className="mt-5 rounded-[1.4rem] border border-cyan-300/15 bg-cyan-300/8 p-4">
                <div className="rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                      )
                    }
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    Prev
                  </button>
                  <p className="text-sm font-semibold text-white">
                    {calendarMonth.toLocaleDateString("en-SG", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                      )
                    }
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    Next
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.22em] text-stone-400">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        if (day.isCurrentMonth) {
                          setSelectedDate(day.date);
                        }
                      }}
                      className={`min-h-[88px] rounded-[1rem] border p-2 text-left transition ${
                        !day.isCurrentMonth
                          ? "border-transparent bg-black/10 opacity-35"
                          : selectedDate === day.date
                            ? "border-cyan-300/40 bg-cyan-300/10"
                            : day.isOverride
                              ? "border-amber-300/25 bg-amber-300/10"
                              : "border-white/8 bg-white/4 hover:bg-white/7"
                      }`}
                    >
                      <p className="text-xs font-semibold text-white">{day.dayNumber}</p>
                      <p className="mt-2 text-[11px] leading-5 text-stone-300">
                        {day.programLabel}
                      </p>
                      {day.isRestDay ? (
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-stone-500">
                          Rest
                        </p>
                      ) : null}
                      {day.isOverride ? (
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                          Override
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-[1rem] border border-white/8 bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">
                    Selected date
                  </p>
                  <p className="mt-2 text-sm text-stone-200">
                    {selectedDate
                      ? `${selectedDate} will use ${selectedProgram.category} if you apply an override.`
                      : "Select a date above to override that specific day."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyDateOverride}
                      className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
                    >
                      Apply Date Override
                    </button>
                    <button
                      type="button"
                      onClick={clearDateOverride}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Clear Override
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">
                      Calendar assignment
                    </p>
                    <p className="mt-2 text-sm text-stone-200">
                      Assign the selected program into any slot in the 4-week rotation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={assignSelectedProgramToSlot}
                    className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Stage Slot Change
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }, (_, weekIndex) => (
                    <div
                      key={`week-${weekIndex + 1}`}
                      className="rounded-[1.15rem] border border-white/8 bg-[#0b1519] p-3"
                    >
                      <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">
                        Week {weekIndex + 1}
                      </p>
                      <div className="mt-3 space-y-2">
                        {calendarSlots
                          .filter((slot) => slot.weekIndex === weekIndex)
                          .map((slot) => {
                            const isSelected = slot.id === selectedSlot.id;

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => setSelectedSlotId(slot.id)}
                                className={`w-full rounded-[1rem] border px-3 py-3 text-left transition ${
                                  isSelected
                                    ? "border-cyan-300/40 bg-cyan-300/10"
                                    : "border-white/8 bg-white/4 hover:bg-white/7"
                                }`}
                              >
                                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                                  {slot.day}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-white">
                                  {slot.category}
                                </p>
                                <p className="mt-1 text-xs text-cyan-100">{slot.group}</p>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            ) : null}

            {isLibraryMode && libraryView === "timeline" ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
                  <div className="rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">
                      Global exercise swap
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field label="Replace exercise">
                        <select
                          value={replaceExerciseFrom}
                          onChange={(event) => setReplaceExerciseFrom(event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#071015] px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="">Choose an exercise</option>
                          {uniqueExerciseNames.map((name) => (
                            <option key={`replace-${name}`} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="With exercise">
                        <select
                          value={replaceExerciseTo}
                          onChange={(event) => setReplaceExerciseTo(event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#071015] px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="">Choose an exercise</option>
                          {uniqueExerciseNames.map((name) => (
                            <option key={`with-${name}`} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={replaceExerciseAcrossPrograms}
                      className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Swap Across Programs
                    </button>
                  </div>
                </div>

                {timelineSections.map(({ section, items }) => (
                  <div
                    key={section}
                    className="rounded-[1.35rem] border border-white/8 bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">{section}</p>
                        <p className="mt-1 text-sm text-stone-300">
                          {items.length} item{items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLibrarySection(section);
                          setLibraryView("picker");
                        }}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Add to {section}
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {items.length ? (
                        items.map((item, index) => (
                          <TimelineItemCard
                            key={item.id}
                            item={item}
                            index={index}
                            programId={selectedProgram.id}
                            draggedId={draggedId}
                            exerciseUsageCount={exerciseUsageMap.get(item.exerciseName) ?? 1}
                            onDragStart={setDraggedId}
                            onMove={moveTimelineItem}
                            onRemove={removeTimelineItem}
                            onUpdate={updateTimelineItem}
                          />
                        ))
                      ) : (
                        <EmptyState text={`No ${section.toLowerCase()} items yet. Add one from the exercise picker.`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {isLibraryMode && libraryView === "picker" ? (
              <div className="mt-5 rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
                <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[1.2rem] border border-cyan-300/15 bg-cyan-300/8 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Preview</p>
                    {previewItem ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr]">
                        <div className="relative aspect-square overflow-hidden rounded-[1rem] bg-white">
                          <DemoMedia
                            src={previewItem.previewMediaSrc ?? previewItem.mediaSrc}
                            alt={previewItem.mediaAlt}
                          />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">{previewItem.exerciseName}</p>
                          <p className="mt-1 text-sm text-stone-300">{previewItem.equipment}</p>
                          <p className="mt-2 text-sm leading-6 text-stone-300">{previewItem.demoSummary}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-stone-300">
                              {previewItem.targetValue} {previewItem.unit}
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-stone-300">
                              {previewItem.durationSec}s cap
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-stone-300">
                              {previewItem.restSec}s rest
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-stone-300">
                        Pick an exercise from the internal bank to preview it here before inserting it into the selected section.
                      </p>
                    )}
                  </div>

                  <div className="rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Internal exercise picker</p>
                    <div className="mt-3 rounded-[1rem] border border-cyan-300/15 bg-cyan-300/8 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100">Adding to</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["Warm-up", "Main session", "Cool-down"] as ProgramTimelineItem["section"][]).map(
                          (section) => (
                            <button
                              key={section}
                              type="button"
                              onClick={() => setLibrarySection(section)}
                              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                                librarySection === section
                                  ? "bg-cyan-300 text-slate-950"
                                  : "border border-white/10 bg-white/5 text-stone-100"
                              }`}
                            >
                              {section}
                            </button>
                          ),
                        )}
                      </div>
                      <p className="mt-3 text-sm text-stone-300">
                        Clicking <span className="font-semibold text-white">Add</span> will insert the selected exercise into <span className="font-semibold text-cyan-100">{librarySection}</span>.
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={pickerLibraryQueryInput}
                        onChange={(event) => setPickerLibraryQueryInput(event.target.value)}
                        placeholder="Search internal exercise library"
                        className="flex-1 rounded-2xl border border-white/10 bg-[#071015] px-3 py-2 text-sm text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setPickerLibraryQuery(pickerLibraryQueryInput.trim())}
                        className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
                      >
                        Search
                      </button>
                    </div>
                    <div className="mt-3 max-h-[40rem] space-y-3 overflow-y-auto pr-1">
                      {libraryItemsForSection.length ? (
                        libraryItemsForSection.map((item) => (
                          <LibraryCard
                            key={item.id}
                            item={item}
                            onPreview={() => setPreviewItem(item)}
                            onAdd={() => addExerciseToProgram(item)}
                            usageCount={exerciseUsageMap.get(item.exerciseName) ?? 0}
                          />
                        ))
                      ) : (
                        <EmptyState text={`No internal ${librarySection.toLowerCase()} exercises match this filter.`} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isExerciseBankMode ? (
              <div className="mt-5 rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
                <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Exercise search</p>
                        <p className="mt-2 text-sm leading-6 text-stone-300">
                          Search the live exercise bank, narrow it with taxonomy filters, then open a result directly into the editor on the right.
                        </p>
                      </div>
                      <div className="rounded-[1rem] border border-white/8 bg-black/20 px-4 py-3 text-right text-sm text-stone-200">
                        <p>{libraryItemsForSection.length} match{libraryItemsForSection.length === 1 ? "" : "es"}</p>
                        <p className="mt-1 text-xs text-stone-400">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1rem] border border-white/8 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Search scope</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {TIMELINE_SECTIONS.map(
                        (section) => (
                          <button
                            key={section}
                            type="button"
                            onClick={() => setLibrarySection(section)}
                            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                              librarySection === section
                                ? "bg-cyan-300 text-slate-950"
                                : "border border-white/10 bg-white/5 text-stone-100"
                            }`}
                          >
                            {section}
                          </button>
                        ),
                      )}
                      </div>
                      <p className="mt-3 text-sm text-stone-300">
                        Results below are filtered to exercises suitable for <span className="font-semibold text-white">{librarySection}</span>.
                      </p>
                    </div>

                    <div className="sticky top-0 z-10 mt-4 space-y-3 rounded-[1rem] border border-white/8 bg-[#0b1519]/95 p-3 backdrop-blur">
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                        <input
                          value={libraryQuery}
                          onChange={(event) => setLibraryQuery(event.target.value)}
                          placeholder="Search by exercise name, equipment, or tags"
                          className="w-full rounded-2xl border border-white/10 bg-[#071015] px-3 py-2 text-sm text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLibraryQuery("");
                            setLibraryMuscleFilter("all");
                            setLibraryTypeFilter("all");
                            setLibraryEquipmentFilter("all");
                          }}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Clear filters
                        </button>
                        <button
                          type="button"
                          onClick={persistInternalLibrary}
                          disabled={isSavingLibrary}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {isSavingLibrary ? "Saving..." : "Save Library"}
                        </button>
                      </div>

                      <div className="space-y-3">
                        <FilterChipRow
                          label="All Muscles"
                          activeValue={libraryMuscleFilter}
                          allValue="all"
                          options={MUSCLE_SUBCATEGORIES}
                          onChange={(value) => setLibraryMuscleFilter(value as ExerciseMuscleCategory | "all")}
                        />
                        <FilterChipRow
                          label="All Types"
                          activeValue={libraryTypeFilter}
                          allValue="all"
                          options={TYPE_SUBCATEGORIES}
                          onChange={(value) => setLibraryTypeFilter(value as ExerciseTypeCategory | "all")}
                        />
                        <FilterChipRow
                          label="All Equipment"
                          activeValue={libraryEquipmentFilter}
                          allValue="all"
                          options={EQUIPMENT_SUBCATEGORIES}
                          onChange={(value) =>
                            setLibraryEquipmentFilter(value as ExerciseEquipmentCategory | "all")
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4 max-h-[62vh] space-y-3 overflow-y-auto border-t border-white/8 pt-4 pr-1">
                      {libraryItemsForSection.length ? (
                        libraryItemsForSection.map((item) => (
                          <LibraryCard
                            key={item.id}
                            item={item}
                            onPreview={() =>
                              setPreviewItem({
                                ...item,
                                previewMediaSrc: item.previewMediaSrc ?? item.mediaSrc,
                              })
                            }
                            onAdd={() => loadLibraryItemIntoEditor(item)}
                            actionLabel="Edit"
                            usageCount={exerciseUsageMap.get(item.exerciseName) ?? 0}
                            isSelected={libraryDraft.id === item.id}
                          />
                        ))
                      ) : (
                        <EmptyState text="No exercises match the current filters. Clear filters or switch section suitability to widen the results." />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div
                      id="internal-library-editor"
                      className="rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Exercise editor</p>
                          <p className="mt-2 text-sm text-stone-300">
                            {editingLibraryEntry
                              ? `Used in ${exerciseUsageMap.get(libraryDraft.exerciseName) ?? 0} program${(exerciseUsageMap.get(libraryDraft.exerciseName) ?? 0) === 1 ? "" : "s"}.`
                              : "Create a reusable library exercise with editable media and coaching details."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editingLibraryEntry ? (
                            <StatusBadge label={editingLibraryEntry.status ?? "active"} tone={editingLibraryEntry.status === "archived" ? "amber" : "emerald"} />
                          ) : (
                            <StatusBadge label="new draft" tone="cyan" />
                          )}
                          <button
                            type="button"
                            onClick={() => resetLibraryDraft(librarySection)}
                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                          >
                            New exercise
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 rounded-[1rem] border border-cyan-300/12 bg-cyan-300/8 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100">Selected exercise</p>
                            <p className="mt-2 text-base font-semibold text-white">
                              {libraryDraft.exerciseName || "No exercise selected yet"}
                            </p>
                            <p className="mt-1 text-sm text-stone-300">
                              {libraryDraft.equipment || "Add equipment, taxonomy, and suitability so this stays searchable later."}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {libraryDraft.muscleCategory ? <StatusBadge label={libraryDraft.muscleCategory} tone="cyan" /> : null}
                            {libraryDraft.typeCategory ? <StatusBadge label={libraryDraft.typeCategory} tone="amber" /> : null}
                            {libraryDraft.equipmentCategory ? <StatusBadge label={libraryDraft.equipmentCategory} tone="stone" /> : null}
                          </div>
                        </div>
                      </div>
                      {editingLibraryEntry ? (
                        <div className="mt-4 rounded-[1rem] border border-white/8 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Used by these programs</p>
                              <p className="mt-2 text-sm text-stone-300">
                                Review the affected programs before saving changes to this exercise.
                              </p>
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white">
                              {(exerciseUsageProgramsMap.get(libraryDraft.exerciseName) ?? []).length} linked
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(exerciseUsageProgramsMap.get(libraryDraft.exerciseName) ?? []).length ? (
                              (exerciseUsageProgramsMap.get(libraryDraft.exerciseName) ?? []).map((program) => (
                                <span
                                  key={`${libraryDraft.id}-${program.id}`}
                                  className="rounded-full border border-white/10 bg-[#0b1519] px-3 py-2 text-xs text-stone-200"
                                >
                                  {program.category}
                                  <span className="ml-2 text-stone-500">{program.group}</span>
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-white/10 bg-[#0b1519] px-3 py-2 text-xs text-stone-400">
                                Not used in any program yet
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Field label="Section">
                          <select
                            value={libraryDraft.section}
                            onChange={(event) =>
                              setLibraryDraft((current) => {
                                const nextSection = event.target.value as ProgramTimelineItem["section"];
                                return getNextDraftWithStarterDefaults(
                                  current,
                                  { section: nextSection },
                                  selectedProgram.id,
                                );
                              })
                            }
                            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                          >
                            <option value="Warm-up">Warm-up</option>
                            <option value="Main session">Main session</option>
                            <option value="Cool-down">Cool-down</option>
                          </select>
                        </Field>
                        <Field label="Exercise name">
                          <input
                            list="canonical-exercise-names"
                            value={libraryDraft.exerciseName}
                            onChange={(event) =>
                              setLibraryDraft((current) =>
                                getNextDraftWithStarterDefaults(
                                  current,
                                  {
                                    exerciseName: event.target.value,
                                    ...inferExerciseTaxonomy({
                                      exerciseName: event.target.value,
                                      equipment: current.equipment,
                                      section: current.section,
                                    }),
                                  },
                                  selectedProgram.id,
                                ),
                              )
                            }
                            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                          />
                        </Field>
                        <Field label="Media source">
                          <select
                            value={libraryDraft.mediaSourceType}
                            onChange={(event) =>
                              setLibraryDraft((current) => ({
                                ...current,
                                mediaSourceType: event.target.value as "internal" | "external",
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                          >
                            <option value="internal">internal</option>
                            <option value="external">external</option>
                          </select>
                        </Field>
                        <Field label="Equipment">
                          <input
                            value={libraryDraft.equipment}
                            onChange={(event) =>
                              setLibraryDraft((current) => ({
                                ...current,
                                equipment: event.target.value,
                                ...inferExerciseTaxonomy({
                                  exerciseName: current.exerciseName,
                                  equipment: event.target.value,
                                  section: current.section,
                                }),
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
                          />
                        </Field>
                        <Field label="Muscle category">
                          <select value={libraryDraft.muscleCategory ?? ""} onChange={(event) => setLibraryDraft((current) => ({ ...current, muscleCategory: (event.target.value || undefined) as ExerciseMuscleCategory | undefined }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none">
                            <option value="">Unassigned</option>
                            {MUSCLE_SUBCATEGORIES.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Type category">
                          <select value={libraryDraft.typeCategory ?? ""} onChange={(event) => setLibraryDraft((current) => ({ ...current, typeCategory: (event.target.value || undefined) as ExerciseTypeCategory | undefined }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none">
                            <option value="">Unassigned</option>
                            {TYPE_SUBCATEGORIES.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Equipment category">
                          <select value={libraryDraft.equipmentCategory ?? ""} onChange={(event) => setLibraryDraft((current) => ({ ...current, equipmentCategory: (event.target.value || undefined) as ExerciseEquipmentCategory | undefined }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none">
                            <option value="">Unassigned</option>
                            {EQUIPMENT_SUBCATEGORIES.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Tags">
                          <input value={(libraryDraft.tags ?? []).join(", ")} onChange={(event) => setLibraryDraft((current) => ({ ...current, tags: event.target.value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean) }))} placeholder="mobility, squat, unilateral" className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none" />
                        </Field>
                        <Field label="Media URL">
                          <input value={libraryDraft.mediaSrc} onChange={(event) => setLibraryDraft((current) => ({ ...current, mediaSrc: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none" />
                          <button type="button" onClick={() => setLibraryDraft((current) => ({ ...current, mediaSrc: buildLocalMediaPath(selectedProgram.id, current.exerciseName || "exercise-demo") }))} className="mt-2 text-xs font-semibold text-cyan-100">
                            Use local path
                          </button>
                        </Field>
                        <Field label="Target">
                          <input value={libraryDraft.targetValue} onChange={(event) => setLibraryDraft((current) => getNextDraftWithStarterDefaults(current, { targetValue: event.target.value }, selectedProgram.id))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none" />
                        </Field>
                        <Field label="Unit">
                          <select value={libraryDraft.unit} onChange={(event) => setLibraryDraft((current) => getNextDraftWithStarterDefaults(current, { unit: event.target.value }, selectedProgram.id))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none">
                            <option value="reps">reps</option>
                            <option value="seconds">seconds</option>
                            <option value="calories">calories</option>
                            <option value="metres">metres</option>
                            <option value="steps">steps</option>
                          </select>
                        </Field>
                        <Field label="Work cap (sec)">
                          <input type="number" min={1} step={1} value={libraryDraft.durationSec} onChange={(event) => setLibraryDraft((current) => ({ ...current, durationSec: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none" />
                        </Field>
                      </div>

                      <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-stone-400">Suitable for</p>
                        <div className="flex flex-wrap gap-2">
                          {SESSION_USAGE_OPTIONS.map((usage) => {
                            const enabled = (libraryDraft.usageContexts ?? []).includes(usage);
                            return (
                              <button
                                key={usage}
                                type="button"
                                onClick={() =>
                                  setLibraryDraft((current) => ({
                                    ...current,
                                    usageContexts: enabled
                                      ? (current.usageContexts ?? []).filter((item) => item !== usage)
                                      : [...(current.usageContexts ?? []), usage],
                                  }))
                                }
                                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                                  enabled ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-[#0b1519] text-stone-200"
                                }`}
                              >
                                {usage}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Field label="Demo summary">
                          <textarea rows={3} value={libraryDraft.demoSummary} onChange={(event) => setLibraryDraft((current) => ({ ...current, demoSummary: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none" />
                        </Field>
                        <Field label="Cue text">
                          <textarea rows={3} value={libraryDraft.cues.join('\n')} onChange={(event) => setLibraryDraft((current) => ({ ...current, cues: event.target.value.split('\n').map((cue) => cue.trim()).filter(Boolean) }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none" />
                        </Field>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={saveLibraryEntry} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
                          {editingLibraryEntry
                            ? "Save changes to this exercise"
                            : "Add to library"}
                        </button>
                        {editingLibraryEntry && linkedProgramsForDraft.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setIsApplyPreviewOpen(true)}
                            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100"
                          >
                            Preview linked updates
                          </button>
                        ) : null}
                        {editingLibraryEntry && linkedProgramsForDraft.length > 0 ? (
                          <button
                            type="button"
                            onClick={applyExerciseChangesToLinkedPrograms}
                            disabled={isSavingProgram}
                            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-60"
                          >
                            {isSavingProgram ? "Applying..." : "Apply to linked programs"}
                          </button>
                        ) : null}
                        {editingLibraryEntry ? (
                          <button
                            type="button"
                            onClick={archiveLibraryEntry}
                            className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100"
                          >
                            Archive exercise
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={persistInternalLibrary}
                          disabled={isSavingLibrary}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {isSavingLibrary ? "Saving library..." : "Save library to database"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {saveError ? (
                <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {saveError}
                </div>
              ) : null}
              {saveMessage ? (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {saveMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isSimulatorOpen ? (
        <ProgramSimulationModal
          key={selectedProgram.id}
          workout={simulationWorkout}
          onClose={() => setIsSimulatorOpen(false)}
        />
      ) : null}
      {isApplyPreviewOpen ? (
        <ModalShell
          title="Preview linked program updates"
          description="Review the linked programs and the exact exercise fields that will be pushed into them before applying the update."
          onClose={() => setIsApplyPreviewOpen(false)}
          containerClassName="max-w-5xl"
        >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Affected programs</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {linkedProgramsForDraft.map((program) => (
                  <span
                    key={`linked-${program.id}`}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-stone-200"
                  >
                    {program.category}
                    <span className="ml-2 text-stone-500">{program.group}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-[#0b1519] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Fields that will change</p>
              <div className="mt-4 space-y-3">
                {changedLinkedFields.length ? (
                  changedLinkedFields.map((change) => (
                    <div
                      key={change.label}
                      className="rounded-[1rem] border border-white/8 bg-black/20 p-3"
                    >
                      <p className="text-sm font-semibold text-white">{change.label}</p>
                      <p className="mt-2 text-xs text-stone-400">Current</p>
                      <p className="mt-1 text-sm text-stone-200">{change.before}</p>
                      <p className="mt-2 text-xs text-cyan-100">Updated</p>
                      <p className="mt-1 text-sm text-cyan-50">{change.after}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No linked field differences detected yet. Save the library record or make a change first." />
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsApplyPreviewOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setIsApplyPreviewOpen(false);
                applyExerciseChangesToLinkedPrograms();
              }}
              disabled={!changedLinkedFields.length || isSavingProgram}
              className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {isSavingProgram ? "Applying..." : "Apply linked updates"}
            </button>
          </div>
        </ModalShell>
      ) : null}

      <datalist id="canonical-exercise-names">
        {canonicalExerciseNames.map((name, index) => (
          <option key={`${name}-${index}`} value={name} />
        ))}
      </datalist>
      <datalist id="program-group-options">
        {programGroupOptions.map((group) => (
          <option key={group} value={group} />
        ))}
      </datalist>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-stone-400">{label}</p>
      {children}
    </label>
  );
}

function FilterChipRow({
  label,
  options,
  activeValue,
  allValue,
  onChange,
}: {
  label: string;
  options: readonly string[];
  activeValue: string;
  allValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(allValue)}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          activeValue === allValue
            ? "bg-cyan-300 text-slate-950"
            : "border border-white/10 bg-[#0b1519] text-stone-200"
        }`}
      >
        {label}
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeValue === option
              ? "bg-cyan-300 text-slate-950"
              : "border border-white/10 bg-white/5 text-stone-200"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function LibraryCard({
  item,
  onPreview,
  onAdd,
  actionLabel = "Add",
  usageCount,
  isSelected = false,
}: {
  item: ExerciseLibraryItem;
  onPreview?: () => void;
  onAdd: () => void;
  actionLabel?: string;
  usageCount?: number;
  isSelected?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.1rem] border p-3 transition ${
        isSelected
          ? "border-cyan-300/35 bg-cyan-300/10"
          : "border-white/8 bg-white/4"
      }`}
      onClick={onPreview}
      role={onPreview ? "button" : undefined}
      tabIndex={onPreview ? 0 : undefined}
      onKeyDown={(event) => {
        if (onPreview && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onPreview();
        }
      }}
    >
      <div className="grid gap-3 grid-cols-[72px_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-[0.9rem] bg-white">
          <DemoMedia src={item.previewMediaSrc ?? item.mediaSrc} alt={item.mediaAlt} />
        </div>
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">{item.exerciseName}</p>
              <p className="mt-1 text-xs text-stone-400">{item.equipment}</p>
              <p className="mt-1 text-xs text-cyan-100">
                {item.sourceType === "ymove"
                  ? "Ymove"
                  : item.sourceType === "external"
                    ? "External"
                    : "Internal"}{" "}
                • {item.section}
              </p>
              {usageCount !== undefined ? (
                <p className="mt-1 text-xs text-stone-500">Used in {usageCount} program{usageCount === 1 ? "" : "s"}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAdd();
              }}
              className="rounded-full bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950"
            >
              {actionLabel}
            </button>
          </div>
          <p className="mt-2 text-xs leading-6 text-stone-300">{item.demoSummary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">
              {item.durationSec}s cap
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">
              {item.restSec}s rest
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-300">
              {item.cycles} cycles
            </span>
            {item.prescriptionType ? (
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                {item.prescriptionType}
              </span>
            ) : null}
          </div>
          {item.coachingNote ? (
            <p className="mt-2 text-xs leading-6 text-amber-50/80">{item.coachingNote}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {item.muscleCategory ? (
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                {item.muscleCategory}
              </span>
            ) : null}
            {item.typeCategory ? (
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-100">
                {item.typeCategory}
              </span>
            ) : null}
            {item.equipmentCategory ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-200">
                {item.equipmentCategory}
              </span>
            ) : null}
          </div>
          {item.usageContexts?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.usageContexts.map((usage) => (
                <span
                  key={`${item.id}-${usage}`}
                  className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-100"
                >
                  {usage}
                </span>
              ))}
            </div>
          ) : null}
          {item.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={`${item.id}-${tag}`}
                  className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatSimulationClock(totalSeconds: number) {
  const normalized = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(normalized / 60);
  const seconds = normalized % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ProgramSimulationModal({
  workout,
  onClose,
}: {
  workout: ReturnType<typeof workoutFromProgramDefinition>;
  onClose: () => void;
}) {
  const phases = useMemo(() => {
    const built: Array<{
      id: string;
      phaseType: "work" | "transition";
      phase: string;
      exercise: {
        name: string;
        durationSec: number;
        restSec: number;
        mediaSrc: string;
        mediaAlt: string;
        equipment: string;
        targetLabel: string;
        coachingNote?: string;
      };
      roundLabel: string;
    }> = [];

    workout.warmup.forEach((exercise, index) => {
      built.push({
        id: `warmup-${index}`,
        phaseType: "work",
        phase: "Warm-up",
        roundLabel: `Cycle ${index + 1}/${workout.warmup.length}`,
        exercise: {
          name: exercise.name,
          durationSec: Math.round(exercise.durationSec),
          restSec: 0,
          mediaSrc: exercise.mediaSrc,
          mediaAlt: exercise.mediaAlt,
          equipment: exercise.equipment,
          targetLabel: exercise.targets.base,
          coachingNote: exercise.coachingNote,
        },
      });
    });

    built.push({
      id: "warmup-transition",
      phaseType: "transition",
      phase: "Transition",
      roundLabel: "Warm-up complete",
      exercise: {
        name: "Transition / Rest",
        durationSec: 30,
        restSec: 0,
        mediaSrc: "/exercise-media/transition-rest.svg",
        mediaAlt: "Transition",
        equipment: "Move to next station",
        targetLabel: "Reset",
      },
    });

    workout.blocks.forEach((block) => {
      block.exercises.forEach((exercise, exerciseIndex) => {
        const cycleCount = Math.max(1, Math.round(exercise.cycles ?? 1));

        Array.from({ length: cycleCount }, (_, cycleIndex) => {
          built.push({
            id: `${block.title}-${exerciseIndex}-${cycleIndex}`,
            phaseType: "work",
            phase: block.title,
            roundLabel: `Cycle ${cycleIndex + 1}/${cycleCount}`,
            exercise: {
              name: exercise.name,
              durationSec: Math.round(exercise.durationSec),
              restSec: Math.round(exercise.restSec),
              mediaSrc: exercise.mediaSrc,
              mediaAlt: exercise.mediaAlt,
              equipment: exercise.equipment,
              targetLabel: exercise.targets.base,
              coachingNote: exercise.coachingNote,
            },
          });

          const isLastExercise = exerciseIndex === block.exercises.length - 1;
          const isLastCycle = cycleIndex === cycleCount - 1;

          if (!(isLastExercise && isLastCycle) && exercise.restSec > 0) {
            built.push({
              id: `${block.title}-${exerciseIndex}-${cycleIndex}-rest`,
              phaseType: "transition",
              phase: "Transition",
              roundLabel: `Next: ${exercise.name}`,
              exercise: {
                name: "Transition / Rest",
                durationSec: Math.round(exercise.restSec),
                restSec: 0,
                mediaSrc: "/exercise-media/transition-rest.svg",
                mediaAlt: "Transition",
                equipment: "Reset and set up",
                targetLabel: "Reset",
              },
            });
          }
        });
      });
    });

    workout.cooldown.forEach((exercise, index) => {
      built.push({
        id: `cooldown-${index}`,
        phaseType: "work",
        phase: "Cool-down",
        roundLabel: `Cycle ${index + 1}/${workout.cooldown.length}`,
        exercise: {
          name: exercise.name,
          durationSec: Math.round(exercise.durationSec),
          restSec: 0,
          mediaSrc: exercise.mediaSrc,
          mediaAlt: exercise.mediaAlt,
          equipment: exercise.equipment,
          targetLabel: exercise.targets.base,
          coachingNote: exercise.coachingNote,
        },
      });
    });

    return built;
  }, [workout]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(phases[0]?.exercise.durationSec ?? 0);

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setTimeout(() => {
      if (remainingSeconds <= 1) {
        const nextIndex = Math.min(currentIndex + 1, phases.length - 1);
        if (nextIndex === currentIndex) {
          setIsRunning(false);
          setRemainingSeconds(0);
          return;
        }

        setCurrentIndex(nextIndex);
        setRemainingSeconds(phases[nextIndex]?.exercise.durationSec ?? 0);
        return;
      }

      setRemainingSeconds((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [currentIndex, isRunning, phases, remainingSeconds]);

  const current = phases[currentIndex];

  if (!current) {
    return null;
  }

  const totalDuration = phases.reduce((sum, phase) => sum + phase.exercise.durationSec, 0);
  const elapsed = phases
    .slice(0, currentIndex)
    .reduce((sum, phase) => sum + phase.exercise.durationSec, 0);
  const overallRemaining = Math.max(0, totalDuration - elapsed - (current.exercise.durationSec - remainingSeconds));

  return (
    <ModalShell
      title={`Test ${workout.category}`}
      description={`Preview the current draft exactly as a member would move through the session before saving your program changes. ${workout.estimatedDurationMin} min total.`}
      onClose={onClose}
      containerClassName="max-w-6xl"
      bodyClassName="p-0"
    >
      <div className="grid min-h-[72vh] gap-0 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="border-b border-white/8 bg-[#071015] lg:border-b-0 lg:border-r">
          <div className="aspect-[4/5] max-h-[56vh] overflow-hidden bg-[#d9e5f6] lg:aspect-auto lg:h-full">
            <DemoMedia src={current.exercise.mediaSrc} alt={current.exercise.mediaAlt} />
          </div>
        </div>

        <div className="flex min-h-0 flex-col p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Session</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatSimulationClock(overallRemaining)}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Phase</p>
              <p className="mt-2 text-2xl font-semibold text-white">{current.phase}</p>
              <p className="mt-1 text-xs text-stone-400">{current.roundLabel}</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Current timer</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatSimulationClock(remainingSeconds)}
              </p>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-[1.5rem] border border-white/8 bg-[#091317] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100">{current.phase}</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{current.exercise.name}</h3>
              <p className="mt-2 text-sm text-stone-300">{current.exercise.equipment}</p>
              <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-black/20 px-5 py-4 text-center">
                <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Target</p>
                <p className="mt-2 text-xl font-semibold text-white">{current.exercise.targetLabel}</p>
              </div>
            </div>

            {current.exercise.coachingNote ? (
              <div className="rounded-[1.2rem] border border-amber-300/15 bg-amber-300/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-amber-100">Coaching note</p>
                <p className="mt-2 text-sm leading-6 text-amber-50/80">{current.exercise.coachingNote}</p>
              </div>
            ) : null}

            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Session length</p>
              <p className="mt-2 text-lg font-semibold text-white">{workout.estimatedDurationMin} minutes total</p>
              <p className="mt-2 text-sm text-stone-400">
                Warm-up, main work, transitions, and cool-down are included in this preview.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={() => {
                const nextIndex = Math.max(0, currentIndex - 1);
                setCurrentIndex(nextIndex);
                setRemainingSeconds(phases[nextIndex]?.exercise.durationSec ?? 0);
                setIsRunning(false);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setIsRunning((value) => !value)}
              className="rounded-full bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950"
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              onClick={() => {
                const nextIndex = Math.min(phases.length - 1, currentIndex + 1);
                setCurrentIndex(nextIndex);
                setRemainingSeconds(phases[nextIndex]?.exercise.durationSec ?? 0);
                setIsRunning(false);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
  containerClassName,
  bodyClassName,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  containerClassName?: string;
  bodyClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 backdrop-blur">
      <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
        <div className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#071015] shadow-2xl shadow-black/40 ${containerClassName ?? ""}`}>
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/8 bg-[#071015] px-5 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">Program studio</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-stone-400">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Close
            </button>
          </div>
          <div className={`overflow-y-auto px-5 py-5 ${bodyClassName ?? ""}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "amber" | "cyan" | "stone";
}) {
  const styles =
    tone === "emerald"
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
      : tone === "amber"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
        : tone === "cyan"
          ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
          : "border-white/10 bg-black/20 text-stone-200";

  return (
    <span className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${styles}`}>
      {label}
    </span>
  );
}

function TimelineItemCard({
  item,
  index,
  programId,
  draggedId,
  exerciseUsageCount,
  onDragStart,
  onMove,
  onRemove,
  onUpdate,
}: {
  item: ProgramTimelineItem;
  index: number;
  programId: string;
  draggedId: string | null;
  exerciseUsageCount: number;
  onDragStart: (id: string | null) => void;
  onMove: (programId: string, draggedItemId: string, targetItemId: string) => void;
  onRemove: (itemId: string) => void;
  onUpdate: (
    programId: string,
    itemId: string,
    updates: Partial<ProgramDefinition["timeline"][number]>,
  ) => void;
}) {
  return (
    <div
      id={item.id}
      draggable
      onDragStart={() => onDragStart(item.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => {
        if (draggedId) {
          onMove(programId, draggedId, item.id);
          onDragStart(null);
        }
      }}
      className="rounded-[1.4rem] border border-white/8 bg-white/4 p-3"
    >
      <div className="grid gap-3 md:grid-cols-[96px_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-[1.1rem] bg-white">
          <DemoMedia src={item.mediaSrc} alt={item.mediaAlt} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100">#{index + 1}</p>
              <h4 className="mt-1 text-lg font-semibold text-white">{item.exerciseName}</h4>
              <p className="mt-1 text-xs text-stone-400">
                Used in {exerciseUsageCount} program{exerciseUsageCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-stone-300">
                {item.cycles} cycles
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-stone-300">
                {item.durationSec}s cap
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-stone-300">
                {item.restSec}s rest
              </span>
              {item.prescriptionType ? <StatusBadge label={item.prescriptionType} tone="cyan" /> : null}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100"
              >
                Remove
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Exercise name">
              <input
                value={item.exerciseName}
                onChange={(event) => onUpdate(programId, item.id, { exerciseName: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
            <Field label="Equipment">
              <input
                value={item.equipment}
                onChange={(event) => onUpdate(programId, item.id, { equipment: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
            <Field label="Target">
              <input
                value={item.targetValue}
                onChange={(event) => onUpdate(programId, item.id, { targetValue: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
            <Field label="Unit">
              <select
                value={item.unit}
                onChange={(event) => onUpdate(programId, item.id, { unit: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
              >
                <option value="reps">reps</option>
                <option value="calories">calories</option>
                <option value="metres">metres</option>
                <option value="seconds">seconds</option>
                <option value="steps">steps</option>
              </select>
            </Field>
            <Field label="Cycles">
              <input
                type="number"
                min={1}
                step={1}
                value={item.cycles}
                onChange={(event) => onUpdate(programId, item.id, { cycles: Number(event.target.value) })}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
            <Field label="Rest (sec)">
              <input
                type="number"
                min={0}
                step={1}
                value={item.restSec}
                onChange={(event) => onUpdate(programId, item.id, { restSec: Number(event.target.value) })}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
            <Field label="Work cap (sec)">
              <input
                type="number"
                min={1}
                step={1}
                value={item.durationSec}
                onChange={(event) => onUpdate(programId, item.id, { durationSec: Number(event.target.value) })}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
            <Field label="Tags">
              <input
                value={(item.tags ?? []).join(", ")}
                onChange={(event) =>
                  onUpdate(programId, item.id, {
                    tags: event.target.value
                      .split(",")
                      .map((tag) => tag.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
                placeholder="squat, lower-body, erg"
                className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
          </div>

          {item.coachingNote ? (
            <div className="rounded-[1rem] border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-sm leading-6 text-amber-50/90">
              <p className="text-[11px] uppercase tracking-[0.22em] text-amber-100/80">Coaching note</p>
              <p className="mt-2">{item.coachingNote}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(item.tags ?? []).map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-stone-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-white/4 px-4 py-4 text-sm text-stone-400">
      {text}
    </div>
  );
}

type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isRestDay: boolean;
  isOverride: boolean;
  programLabel: string;
};

function buildCalendarMonth(monthDate: Date, overrides: DateProgramOverride[]): CalendarDay[] {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstWeekday);
  const lastWeekday = (lastDay.getDay() + 6) % 7;
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastWeekday));

  const days: CalendarDay[] = [];

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = cursor.getDay();
    const weekdayIndex = weekday === 0 ? 6 : weekday - 1;
    const date = toDateKey(cursor);
    const override = overrides.find((item) => item.date === date);
    const isRestDay = weekday === 0;
    const automaticProgram =
      !isRestDay && weekdayIndex >= 0 && weekdayIndex <= 5
        ? getProgramForWeekday(weekdayIndex, cursor)
        : null;

    days.push({
      date,
      dayNumber: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() === monthDate.getMonth(),
      isRestDay,
      isOverride: Boolean(override),
      programLabel: override?.category ?? automaticProgram?.name ?? "Rest",
    });
  }

  return days;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
