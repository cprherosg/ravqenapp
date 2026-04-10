"use server";

import { revalidatePath } from "next/cache";
import { RAVQEN_TERMS_VERSION, RAVQEN_WAIVER_VERSION } from "@/lib/legal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerAuthUser } from "@/lib/supabase/session";
import type { ExercisePerformanceEntry, IntensityLevel } from "@/lib/types";
import {
  entriesToPerformanceRows,
  serializeFeedbackNotes,
  summarizeExerciseLoads,
} from "@/lib/workout-performance";

function usesSessionCredits(tierType: string | null | undefined) {
  return tierType === "single_session_pack" || tierType === "complimentary";
}

export async function acceptRequiredLegalDocumentsAction(input: {
  acceptedName: string;
  signatureDataUrl: string;
  waiverVersion: string;
  termsVersion: string;
}) {
  try {
    const authUser = await getServerAuthUser();

    if (!authUser) {
      throw new Error("You need to sign in before accepting the Ravqen legal documents.");
    }

    if (!input.acceptedName.trim()) {
      throw new Error("Please enter your full name before continuing.");
    }

    if (!input.signatureDataUrl.trim()) {
      throw new Error("Please sign with your finger before continuing.");
    }

    if (
      input.waiverVersion !== RAVQEN_WAIVER_VERSION ||
      input.termsVersion !== RAVQEN_TERMS_VERSION
    ) {
      throw new Error("The legal documents were updated. Please refresh and try again.");
    }

    const supabase = createAdminSupabaseClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from("member_legal_acceptances").upsert(
      [
        {
          user_id: authUser.id,
          document_type: "waiver",
          document_version: input.waiverVersion,
          accepted_name: input.acceptedName.trim(),
          signature_data_url: input.signatureDataUrl,
          accepted_at: now,
        },
        {
          user_id: authUser.id,
          document_type: "terms",
          document_version: input.termsVersion,
          accepted_name: input.acceptedName.trim(),
          signature_data_url: input.signatureDataUrl,
          accepted_at: now,
        },
      ],
      { onConflict: "user_id,document_type" },
    );

    if (error) {
      throw error;
    }

    revalidatePath("/player");
    revalidatePath("/player/legal");
    revalidatePath("/player/workout");
    return { ok: true as const };
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Unable to record your waiver and terms acceptance.";
    const message = rawMessage.toLowerCase().includes("member_legal_acceptances")
      ? "Unable to record acceptance because the legal-consent table is not live yet. Run the latest Supabase schema update first."
      : rawMessage;
    return {
      ok: false as const,
      message,
    };
  }
}

export async function markWorkoutInProgressAction(input: {
  sessionId: string;
  intensity: IntensityLevel;
}) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("workout_sessions")
      .update({
        status: "in_progress",
        intensity_selected: input.intensity,
      })
      .eq("id", input.sessionId);

    if (error) {
      throw error;
    }

    revalidatePath("/player");
    revalidatePath("/player/workout");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Unable to mark workout as started.",
    };
  }
}

export async function stopWorkoutEarlyAction(input: {
  sessionId: string;
  intensity: IntensityLevel;
}) {
  try {
    const supabase = createAdminSupabaseClient();
    const { data: sessionRow, error: sessionFetchError } = await supabase
      .from("workout_sessions")
      .select("id,user_id,status,workout_slug")
      .eq("id", input.sessionId)
      .single();

    if (sessionFetchError || !sessionRow) {
      throw sessionFetchError ?? new Error("Unable to find workout session.");
    }

    if (sessionRow.status !== "completed" && sessionRow.status !== "skipped") {
      const { error: sessionError } = await supabase
        .from("workout_sessions")
        .update({
          status: "skipped",
          intensity_selected: input.intensity,
          completed_at: new Date().toISOString(),
        })
        .eq("id", input.sessionId);

      if (sessionError) {
        throw sessionError;
      }

      const { data: membershipRow } = await supabase
        .from("memberships")
        .select("sessions_remaining,tier_type")
        .eq("user_id", sessionRow.user_id)
        .single();

      if (
        usesSessionCredits(membershipRow?.tier_type) &&
        membershipRow.sessions_remaining > 0
      ) {
        const { error: membershipError } = await supabase
          .from("memberships")
          .update({
            sessions_remaining: membershipRow.sessions_remaining - 1,
          })
          .eq("user_id", sessionRow.user_id);

        if (membershipError) {
          throw membershipError;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          last_workout_summary: "Workout ended early. Session credit was still used.",
        })
        .eq("id", sessionRow.user_id);

      if (profileError) {
        throw profileError;
      }
    }

    revalidatePath("/player");
    revalidatePath("/player/workout");
    revalidatePath("/player/history");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Unable to stop workout right now.",
    };
  }
}

export async function saveWorkoutCompletionAction(input: {
  sessionId: string;
  intensity: IntensityLevel;
  replayCount: number;
  rpe: number | null;
  loadSummary: string;
  notes: string;
  exerciseEntries: ExercisePerformanceEntry[];
}) {
  try {
    const supabase = createAdminSupabaseClient();
    const { data: sessionRow, error: sessionFetchError } = await supabase
      .from("workout_sessions")
      .select("id,user_id,status,workout_slug")
      .eq("id", input.sessionId)
      .single();

    if (sessionFetchError || !sessionRow) {
      throw sessionFetchError ?? new Error("Unable to find workout session.");
    }

    const { error: sessionError } = await supabase
      .from("workout_sessions")
      .update({
        status: "completed",
        intensity_selected: input.intensity,
        replay_count: input.replayCount,
        feedback_submitted: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", input.sessionId);

    if (sessionError) {
      throw sessionError;
    }

    const persistedNotes = serializeFeedbackNotes({
      memberNotes: input.notes,
      exerciseEntries: input.exerciseEntries,
    });
    const derivedLoadSummary = summarizeExerciseLoads(input.exerciseEntries);

    const { error: feedbackError } = await supabase
      .from("session_feedback")
      .upsert(
        {
          session_id: input.sessionId,
          rpe: input.rpe,
          load_summary: input.loadSummary.trim() || derivedLoadSummary,
          notes: persistedNotes,
        },
        { onConflict: "session_id" },
      );

    if (feedbackError) {
      throw feedbackError;
    }

    try {
      const { error: deletePerformanceError } = await supabase
        .from("exercise_performance")
        .delete()
        .eq("session_id", input.sessionId);

      if (deletePerformanceError) {
        throw deletePerformanceError;
      }

      if (input.exerciseEntries.length) {
        const { error: insertPerformanceError } = await supabase
          .from("exercise_performance")
          .insert(entriesToPerformanceRows(input.sessionId, input.exerciseEntries));

        if (insertPerformanceError) {
          throw insertPerformanceError;
        }
      }
    } catch {
      // Keep the structured note fallback working until the dedicated table
      // is created in every environment.
    }

    if (sessionRow.status !== "completed") {
      const { data: membershipRow } = await supabase
        .from("memberships")
        .select("sessions_remaining,tier_type")
        .eq("user_id", sessionRow.user_id)
        .single();

      if (
        usesSessionCredits(membershipRow?.tier_type) &&
        membershipRow.sessions_remaining > 0
      ) {
        const { error: membershipError } = await supabase
          .from("memberships")
          .update({
            sessions_remaining: membershipRow.sessions_remaining - 1,
          })
          .eq("user_id", sessionRow.user_id);

        if (membershipError) {
          throw membershipError;
        }
      }

      const workoutCategory = sessionRow.workout_slug
        .replace(/-\d+$/, "")
        .split("-")
        .slice(0, -2)
        .join(" ")
        .replace(/\b\w/g, (match: string) => match.toUpperCase());

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          last_workout_summary: `Completed ${workoutCategory} at RPE ${input.rpe ?? "n/a"}. ${input.notes.trim() || derivedLoadSummary || "No notes added."}`,
        })
        .eq("id", sessionRow.user_id);

      if (profileError) {
        throw profileError;
      }
    }

    revalidatePath("/player");
    revalidatePath("/player/workout");
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Unable to save workout completion.",
    };
  }
}
