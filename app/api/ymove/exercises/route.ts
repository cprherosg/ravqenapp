import { NextResponse } from "next/server";
import { hasYmoveApiKey, searchYmoveExercises } from "@/lib/ymove";

export async function GET(request: Request) {
  if (!hasYmoveApiKey()) {
    return NextResponse.json(
      {
        ok: false,
        message: "YMOVE_API_KEY is not configured yet.",
        exercises: [],
      },
      { status: 503 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const exercises = await searchYmoveExercises({
      q: searchParams.get("q") ?? undefined,
      exerciseType: searchParams.get("exerciseType") ?? undefined,
      muscleGroup: searchParams.get("muscleGroup") ?? undefined,
      equipment: searchParams.get("equipment") ?? undefined,
      hasVideo: searchParams.get("hasVideo") !== "false",
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 12,
    });

    return NextResponse.json({
      ok: true,
      exercises,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unable to load Ymove exercises.",
        exercises: [],
      },
      { status: 500 },
    );
  }
}
