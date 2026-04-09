export type MembershipStatus = "active" | "paused" | "expired";

export type MemberAccessTier = {
  id: "single_session_pack" | "weekly_limit" | "monthly_unlimited" | "complimentary";
  label: string;
};

export type MemberProfile = {
  id: string;
  name: string;
  email: string;
  tierType: MemberAccessTier["id"];
  tierLabel: string;
  status: MembershipStatus;
  weeklyLimit: number | null;
  sessionsRemaining: number;
  allowedCategories: string[];
  gymProfile: string;
  equipmentOverride: string;
  goalFocus: string;
  lastWorkoutSummary: string;
  notes: string;
};

export const membershipTiers: MemberAccessTier[] = [
  { id: "single_session_pack", label: "Session pack" },
  { id: "weekly_limit", label: "Weekly limit" },
  { id: "monthly_unlimited", label: "Unlimited" },
  { id: "complimentary", label: "Complimentary" },
];

export const workoutCategories = [
  "Complimentary",
  "Strength",
  "Pump",
  "Hyper",
  "H.I.R.T",
  "Power",
  "Hyrox",
  "Cardio Summit",
  "Cardio U",
  "Cardio HIIT",
  "CrewFit",
  "XTX",
  "Strength Endurance",
  "Shred",
  "Balanced",
];

export const adminMembers: MemberProfile[] = [
  {
    id: "mem-001",
    name: "Luqman",
    email: "luqman@ravqen.test",
    tierType: "monthly_unlimited",
    tierLabel: "Unlimited",
    status: "active",
    weeklyLimit: null,
    sessionsRemaining: 99,
    allowedCategories: workoutCategories,
    gymProfile: "Commercial gym with full rack, sled, ski erg, assault bike",
    equipmentOverride: "No override. Full template access.",
    goalFocus: "Maintain conditioning while keeping lower-body strength progressing.",
    lastWorkoutSummary: "Completed all squat cycles. Rated RPE 7. Wanted slightly longer transition before sled.",
    notes:
      "Primary admin account. Keep access open to all categories and future beta features.",
  },
  {
    id: "mem-002",
    name: "Marcus Tan",
    email: "marcus@ravqen.test",
    tierType: "weekly_limit",
    tierLabel: "Weekly limit",
    status: "active",
    weeklyLimit: 3,
    sessionsRemaining: 2,
    allowedCategories: ["Strength", "Balanced", "CrewFit"],
    gymProfile: "Commercial gym but no ski erg",
    equipmentOverride: "Replace ski erg with rower or treadmill push whenever used.",
    goalFocus: "Fat loss and consistency without overly technical lifts.",
    lastWorkoutSummary: "Skipped split squat. Reported right-knee discomfort and asked for easier unilateral options.",
    notes:
      "Prefer simpler exercise pool. Keep sessions under 50 minutes and avoid excessive setup complexity.",
  },
  {
    id: "mem-003",
    name: "Alya Rahman",
    email: "alya@ravqen.test",
    tierType: "single_session_pack",
    tierLabel: "Session pack",
    status: "paused",
    weeklyLimit: null,
    sessionsRemaining: 5,
    allowedCategories: ["Hyper", "Cardio HIIT", "Balanced"],
    gymProfile: "Boutique gym with dumbbells, cables, bike, treadmill",
    equipmentOverride: "Avoid sled and barbell back squat. Substitute with hack squat or goblet squat.",
    goalFocus: "General fitness and confidence using the gym independently.",
    lastWorkoutSummary: "Liked the guided timer. Wants more upper-body sessions and clearer exercise previews.",
    notes:
      "Good candidate for a future women-focused onboarding pathway. Keep movement library friendly and accessible.",
  },
];
