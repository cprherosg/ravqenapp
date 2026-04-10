"use server";

import { revalidatePath } from "next/cache";
import { getAppOrigin } from "@/lib/app-origin";
import { isSuperAdminEmail } from "@/lib/auth/admin-constants";
import { assertAdminActionAccess } from "@/lib/auth/admin";
import {
  membershipTiers,
  type MemberProfile,
} from "@/lib/admin-data";
import type {
  DateProgramOverride,
  InternalExerciseLibraryEntry,
  ProgramDefinition,
  RotationCalendarSlot,
} from "@/lib/program-editor-data";
import {
  archiveProgramDefinition,
  deleteProgramDefinition,
  saveProgramDefinition,
  saveInternalExerciseLibrary,
  saveRotationCalendar,
} from "@/lib/repositories/programming";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicServerSupabaseClient } from "@/lib/supabase/public-server";
import { isUuid } from "@/lib/utils/is-uuid";

export type CreateMemberInput = {
  email: string;
  name: string;
  password?: string;
  tierType: MemberProfile["tierType"];
  status: MemberProfile["status"];
  weeklyLimit: number | null;
  sessionsRemaining: number;
  allowedCategories: string[];
  gymProfile: string;
  equipmentOverride: string;
  goalFocus: string;
  notes: string;
};

export async function createMemberAction(
  input: CreateMemberInput,
): Promise<
  | { ok: true; member: MemberProfile }
  | { ok: false; message: string }
> {
  try {
    await assertAdminActionAccess();
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const password = input.password?.trim();

    if (!email || !name) {
      return {
        ok: false,
        message: "Name and email are required.",
      };
    }

    const supabase = createAdminSupabaseClient();
    const normalizedWeeklyLimit =
      input.tierType === "weekly_limit" ? (input.weeklyLimit ?? 3) : 0;
    const normalizedSessionsRemaining =
      input.tierType === "monthly_unlimited" ? 9999 : input.sessionsRemaining;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let userId = existingProfile?.id ?? null;

    if (!userId) {
      const createUserResult = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: password && password.length >= 8 ? password : `${crypto.randomUUID()}Aa1!`,
        user_metadata: {
          full_name: name,
        },
      });

      if (createUserResult.error || !createUserResult.data.user) {
        return {
          ok: false,
          message:
            createUserResult.error?.message ??
            "Unable to create member in Supabase auth.",
        };
      }

      userId = createUserResult.data.user.id;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: name,
      last_workout_summary: "No sessions completed yet.",
    });

    if (profileError) {
      return {
        ok: false,
        message: profileError.message,
      };
    }

    const { error: membershipError } = await supabase.from("memberships").upsert({
      user_id: userId,
      tier_type: input.tierType,
      status: input.status,
      weekly_limit: normalizedWeeklyLimit,
      sessions_remaining: normalizedSessionsRemaining,
      allowed_categories: input.allowedCategories,
      gym_profile: input.gymProfile,
      equipment_override: input.equipmentOverride,
      goal_focus: input.goalFocus,
      notes: input.notes,
    });

    if (membershipError) {
      return {
        ok: false,
        message: membershipError.message,
      };
    }

    const tierLabel =
      membershipTiers.find((tier) => tier.id === input.tierType)?.label ??
      "Weekly limit";

    revalidatePath("/admin");

    return {
      ok: true,
      member: {
        id: userId,
        name,
        email,
        tierType: input.tierType,
        tierLabel,
        status: input.status,
        weeklyLimit: input.tierType === "weekly_limit" ? normalizedWeeklyLimit : null,
        sessionsRemaining: normalizedSessionsRemaining,
        allowedCategories: input.allowedCategories,
        gymProfile: input.gymProfile,
        equipmentOverride: input.equipmentOverride,
        goalFocus: input.goalFocus,
        lastWorkoutSummary: "Member created. Invite or login can be handled later.",
        notes: input.notes,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error while creating member.",
    };
  }
}

export async function updateMemberAction(
  input: Omit<MemberProfile, "tierLabel">,
): Promise<
  | { ok: true; member: MemberProfile }
  | { ok: false; message: string }
> {
  try {
    await assertAdminActionAccess();
    if (!isUuid(input.id)) {
      return {
        ok: false,
        message:
          "This is a prototype-only seeded member. Create a real member in Supabase to persist edits.",
      };
    }

    const supabase = createAdminSupabaseClient();
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.name.trim();
    const normalizedWeeklyLimit =
      input.tierType === "weekly_limit" ? (input.weeklyLimit ?? 3) : 0;
    const normalizedSessionsRemaining =
      input.tierType === "monthly_unlimited" ? 9999 : input.sessionsRemaining;

    const { error: authUserError } = await supabase.auth.admin.updateUserById(input.id, {
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        full_name: normalizedName,
      },
    });

    if (authUserError) {
      return {
        ok: false,
        message: authUserError.message,
      };
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        email: normalizedEmail,
        full_name: normalizedName,
        last_workout_summary: input.lastWorkoutSummary,
      })
      .eq("id", input.id);

    if (profileError) {
      return {
        ok: false,
        message: profileError.message,
      };
    }

    const { error: membershipError } = await supabase
      .from("memberships")
      .update({
        tier_type: input.tierType,
        status: input.status,
        weekly_limit: normalizedWeeklyLimit,
        sessions_remaining: normalizedSessionsRemaining,
        allowed_categories: input.allowedCategories,
        gym_profile: input.gymProfile,
        equipment_override: input.equipmentOverride,
        goal_focus: input.goalFocus,
        notes: input.notes,
      })
      .eq("user_id", input.id);

    if (membershipError) {
      return {
        ok: false,
        message: membershipError.message,
      };
    }

    revalidatePath("/admin");

    const tierLabel =
      membershipTiers.find((tier) => tier.id === input.tierType)?.label ??
      "Weekly limit";

    return {
      ok: true,
      member: {
        ...input,
        weeklyLimit: input.tierType === "weekly_limit" ? normalizedWeeklyLimit : null,
        sessionsRemaining: normalizedSessionsRemaining,
        tierLabel,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error while saving member.",
    };
  }
}

export async function deleteMemberAction(
  memberId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertAdminActionAccess();
    if (!isUuid(memberId)) {
      return {
        ok: false,
        message:
          "Prototype seeded members cannot be removed from Supabase because they do not exist there yet.",
      };
    }

    const supabase = createAdminSupabaseClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", memberId)
      .maybeSingle();

    if (isSuperAdminEmail(profile?.email)) {
      return {
        ok: false,
        message: "The super admin account cannot be deleted.",
      };
    }

    const { error } = await supabase.auth.admin.deleteUser(memberId);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error while deleting member.",
    };
  }
}

export async function sendMemberPasswordResetAction(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertAdminActionAccess();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return {
        ok: false,
        message: "Member email is required.",
      };
    }

    const supabase = createPublicServerSupabaseClient();
    const origin = await getAppOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${origin}/auth/password-reset`,
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to send password reset email.",
    };
  }
}

export async function setMemberTemporaryPasswordAction(input: {
  memberId: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertAdminActionAccess();
    if (!isUuid(input.memberId)) {
      return {
        ok: false,
        message: "Only real Supabase-backed members can receive a temporary password.",
      };
    }

    const password = input.password.trim();

    if (password.length < 8) {
      return {
        ok: false,
        message: "Temporary password must be at least 8 characters.",
      };
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.auth.admin.updateUserById(input.memberId, {
      password,
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to set temporary password.",
    };
  }
}

export async function saveProgramDefinitionAction(
  program: ProgramDefinition,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertAdminActionAccess();
    await saveProgramDefinition(program);
    revalidatePath("/admin");
    revalidatePath("/player");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error while saving program changes.",
    };
  }
}

export async function deleteProgramDefinitionAction(
  programId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertAdminActionAccess();
    await deleteProgramDefinition(programId);
    revalidatePath("/admin");
    revalidatePath("/admin/programs");
    revalidatePath("/admin/programs/library");
    revalidatePath("/player");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error while deleting program.",
    };
  }
}

export async function archiveProgramDefinitionAction(
  programId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertAdminActionAccess();
    await archiveProgramDefinition(programId);
    revalidatePath("/admin");
    revalidatePath("/admin/programs");
    revalidatePath("/admin/programs/library");
    revalidatePath("/player");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error while archiving program.",
    };
  }
}

export async function saveRotationCalendarAction(
  input: {
    slots: RotationCalendarSlot[];
    dateOverrides: DateProgramOverride[];
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertAdminActionAccess();
    await saveRotationCalendar(input.slots, input.dateOverrides);
    revalidatePath("/admin");
    revalidatePath("/admin/programs");
    revalidatePath("/player");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error while saving the rotation calendar.",
    };
  }
}

export async function saveInternalExerciseLibraryAction(
  entries: InternalExerciseLibraryEntry[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertAdminActionAccess();
    await saveInternalExerciseLibrary(entries);
    revalidatePath("/admin/programs");
    revalidatePath("/admin/programs/library");
    revalidatePath("/admin/programs/exercises");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error while saving the internal exercise library.",
    };
  }
}
