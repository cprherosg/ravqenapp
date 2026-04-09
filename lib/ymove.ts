const YMOVE_BASE_URL = "https://exercise-api.ymove.app/api/v2";

export type YmoveExerciseSummary = {
  id: string;
  slug?: string;
  title: string;
  exerciseType?: string[];
  primaryMuscles?: string[];
  equipment?: string[];
  thumbnailUrl?: string;
  videoUrl?: string;
  instructions?: string[];
};

export function getYmoveApiKey() {
  return process.env.YMOVE_API_KEY ?? process.env.YMOVE_EXERCISE_API_KEY ?? "";
}

export function hasYmoveApiKey() {
  return Boolean(getYmoveApiKey());
}

async function ymoveFetch(path: string) {
  const apiKey = getYmoveApiKey();

  if (!apiKey) {
    throw new Error("Missing YMOVE_API_KEY");
  }

  const response = await fetch(`${YMOVE_BASE_URL}${path}`, {
    headers: {
      "X-API-Key": apiKey,
    },
    next: {
      revalidate: 60 * 30,
    },
  });

  if (!response.ok) {
    throw new Error(`Ymove request failed: ${response.status}`);
  }

  return response.json();
}

function normalizeExercise(raw: Record<string, unknown>): YmoveExerciseSummary {
  return {
    id: String(raw.id ?? raw.slug ?? ""),
    slug: typeof raw.slug === "string" ? raw.slug : undefined,
    title:
      typeof raw.title === "string"
        ? raw.title
        : typeof raw.name === "string"
          ? raw.name
          : "Exercise",
    exerciseType: Array.isArray(raw.exerciseType)
      ? raw.exerciseType.filter((value): value is string => typeof value === "string")
      : undefined,
    primaryMuscles: Array.isArray(raw.primaryMuscles)
      ? raw.primaryMuscles.filter((value): value is string => typeof value === "string")
      : undefined,
    equipment: Array.isArray(raw.equipment)
      ? raw.equipment.filter((value): value is string => typeof value === "string")
      : undefined,
    thumbnailUrl: typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : undefined,
    videoUrl: typeof raw.videoUrl === "string" ? raw.videoUrl : undefined,
    instructions: Array.isArray(raw.instructions)
      ? raw.instructions.filter((value): value is string => typeof value === "string")
      : undefined,
  };
}

export async function searchYmoveExercises(input: {
  q?: string;
  exerciseType?: string;
  muscleGroup?: string;
  equipment?: string;
  hasVideo?: boolean;
  limit?: number;
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.exerciseType) params.set("exerciseType", input.exerciseType);
  if (input.muscleGroup) params.set("muscleGroup", input.muscleGroup);
  if (input.hasVideo) params.set("hasVideo", "true");
  if (input.limit) params.set("limit", String(input.limit));

  const payload = await ymoveFetch(`/exercises?${params.toString()}`);
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  const normalized = items.map((item: unknown) =>
    normalizeExercise(item as Record<string, unknown>),
  );

  if (!input.equipment) {
    return normalized;
  }

  const equipmentQuery = input.equipment.toLowerCase();

  return normalized.filter((item: YmoveExerciseSummary) =>
    item.equipment?.some((equipment: string) =>
      equipment.toLowerCase().includes(equipmentQuery),
    ),
  );
}

export async function fetchYmoveExercise(idOrSlug: string) {
  const payload = await ymoveFetch(`/exercises/${idOrSlug}`);
  return normalizeExercise(payload as Record<string, unknown>);
}
