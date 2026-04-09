import type { ExercisePerformanceEntry } from "@/lib/types";
import type { Database } from "@/lib/supabase/database";

const FEEDBACK_PREFIX = "__RAVQEN_FEEDBACK__:";

type EncodedFeedback = {
  memberNotes: string | null;
  exerciseEntries: ExercisePerformanceEntry[];
};

function normalizeEntry(entry: ExercisePerformanceEntry): ExercisePerformanceEntry {
  return {
    ...entry,
    achievedValue: entry.achievedValue?.trim() || null,
    loadValue: entry.loadValue?.trim() || null,
    notes: entry.notes?.trim() || null,
  };
}

export function serializeFeedbackNotes(input: {
  memberNotes: string;
  exerciseEntries: ExercisePerformanceEntry[];
}) {
  const memberNotes = input.memberNotes.trim() || null;
  const exerciseEntries = input.exerciseEntries.map(normalizeEntry);

  if (!memberNotes && exerciseEntries.every((entry) => !entry.achievedValue && !entry.loadValue && !entry.notes)) {
    return null;
  }

  return `${FEEDBACK_PREFIX}${JSON.stringify({
    memberNotes,
    exerciseEntries,
  } satisfies EncodedFeedback)}`;
}

export function parseFeedbackNotes(notes: string | null | undefined) {
  if (!notes) {
    return {
      memberNotes: null,
      exerciseEntries: [] as ExercisePerformanceEntry[],
    };
  }

  if (!notes.startsWith(FEEDBACK_PREFIX)) {
    return {
      memberNotes: notes,
      exerciseEntries: [] as ExercisePerformanceEntry[],
    };
  }

  try {
    const parsed = JSON.parse(notes.slice(FEEDBACK_PREFIX.length)) as EncodedFeedback;
    return {
      memberNotes: parsed.memberNotes ?? null,
      exerciseEntries: Array.isArray(parsed.exerciseEntries)
        ? parsed.exerciseEntries.map(normalizeEntry)
        : [],
    };
  } catch {
    return {
      memberNotes: notes,
      exerciseEntries: [] as ExercisePerformanceEntry[],
    };
  }
}

export function summarizeExerciseLoads(entries: ExercisePerformanceEntry[]) {
  const loadEntries = entries
    .filter((entry) => entry.loadValue)
    .slice(0, 4)
    .map((entry) => `${entry.exerciseName} ${entry.loadValue}`);

  return loadEntries.length ? loadEntries.join(", ") : null;
}

export function extractMovementPersonalBestsFromEntries(entries: ExercisePerformanceEntry[]) {
  const byMovement = new Map<string, number>();

  for (const entry of entries) {
    const loadMatch = entry.loadValue?.match(/(\d+(?:\.\d+)?)/);
    const load = loadMatch ? Number(loadMatch[1]) : Number.NaN;

    if (!entry.exerciseName || !Number.isFinite(load)) {
      continue;
    }

    byMovement.set(entry.exerciseName, Math.max(load, byMovement.get(entry.exerciseName) ?? 0));
  }

  return Array.from(byMovement.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([movement, load]) => ({
      movement,
      loadLabel: `${load} kg`,
    }));
}

export function findLatestExerciseEntry(
  history: Array<{ exerciseEntries: ExercisePerformanceEntry[] }>,
  exerciseName: string,
) {
  for (const item of history) {
    const match = item.exerciseEntries.find((entry) => entry.exerciseName === exerciseName);
    if (match) {
      return match;
    }
  }

  return null;
}

export type ExercisePerformanceRow = Database["public"]["Tables"]["exercise_performance"]["Row"];

export function performanceRowsToEntries(rows: ExercisePerformanceRow[]) {
  return rows
    .slice()
    .sort((a, b) => a.serial - b.serial)
    .map((row) => ({
      exerciseKey: row.exercise_key,
      exerciseName: row.exercise_name,
      serial: row.serial,
      phase: row.phase,
      roundLabel: row.round_label,
      equipment: row.equipment,
      targetLabel: row.target_label,
      targetUnit: row.target_unit ?? "",
      achievedValue: row.achieved_value,
      loadValue: row.load_value,
      notes: row.notes,
    }));
}

export function entriesToPerformanceRows(sessionId: string, entries: ExercisePerformanceEntry[]) {
  return entries.map((entry) => ({
    session_id: sessionId,
    exercise_key: entry.exerciseKey,
    exercise_name: entry.exerciseName,
    serial: entry.serial,
    phase: entry.phase,
    round_label: entry.roundLabel,
    equipment: entry.equipment,
    target_label: entry.targetLabel,
    target_unit: entry.targetUnit || null,
    achieved_value: entry.achievedValue,
    load_value: entry.loadValue,
    notes: entry.notes,
  }));
}
