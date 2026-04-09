import {
  adminMembers,
  membershipTiers,
  type MemberProfile,
} from "@/lib/admin-data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function tierLabelFor(type: MemberProfile["tierType"]) {
  return (
    membershipTiers.find((tier) => tier.id === type)?.label ?? "Weekly limit"
  );
}

export async function getAdminMembers(): Promise<MemberProfile[]> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        last_workout_summary,
        memberships (
          tier_type,
          status,
          weekly_limit,
          sessions_remaining,
          allowed_categories,
          gym_profile,
          equipment_override,
          goal_focus,
          notes
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data?.length) {
      return adminMembers;
    }

    return data.map((row) => {
      const membership = Array.isArray(row.memberships)
        ? row.memberships[0]
        : row.memberships;

      const tierType =
        membership?.tier_type ?? ("weekly_limit" satisfies MemberProfile["tierType"]);

      return {
        id: row.id,
        name: row.full_name,
        email: row.email,
        tierType,
        tierLabel: tierLabelFor(tierType),
        status: membership?.status ?? "active",
        weeklyLimit:
          tierType === "weekly_limit" ? (membership?.weekly_limit ?? 3) : null,
        sessionsRemaining: membership?.sessions_remaining ?? 3,
        allowedCategories: membership?.allowed_categories ?? ["Strength", "Balanced"],
        gymProfile:
          membership?.gym_profile ??
          "Commercial gym with standard free weights and cardio machines",
        equipmentOverride: membership?.equipment_override ?? "No override yet.",
        goalFocus:
          membership?.goal_focus ??
          "Build consistency and follow guided training at a sustainable pace.",
        lastWorkoutSummary:
          row.last_workout_summary ?? "No sessions completed yet.",
        notes: membership?.notes ?? "",
      };
    });
  } catch {
    return adminMembers;
  }
}
