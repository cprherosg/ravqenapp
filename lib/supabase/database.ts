export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      memberships: {
        Row: {
          allowed_categories: string[];
          created_at: string;
          equipment_override: string | null;
          goal_focus: string | null;
          gym_profile: string | null;
          id: string;
          notes: string | null;
          sessions_remaining: number;
          status: "active" | "paused" | "expired";
          tier_type:
            | "single_session_pack"
            | "weekly_limit"
            | "monthly_unlimited"
            | "complimentary";
          updated_at: string;
          user_id: string;
          weekly_limit: number;
        };
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_admin: boolean;
          last_workout_summary: string | null;
          updated_at: string;
        };
      };
      session_feedback: {
        Row: {
          created_at: string;
          id: string;
          load_summary: string | null;
          notes: string | null;
          rpe: number | null;
          session_id: string;
        };
      };
      exercise_performance: {
        Row: {
          achieved_value: string | null;
          created_at: string;
          equipment: string;
          exercise_key: string;
          exercise_name: string;
          id: string;
          load_value: string | null;
          notes: string | null;
          phase: string;
          round_label: string;
          serial: number;
          session_id: string;
          target_label: string;
          target_unit: string | null;
        };
      };
      workout_sessions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          feedback_submitted: boolean;
          id: string;
          intensity_selected: "low" | "base" | "high";
          replay_count: number;
          scheduled_for: string;
          status: "scheduled" | "in_progress" | "completed" | "skipped";
          user_id: string;
          workout_slug: string;
        };
      };
      workout_templates: {
        Row: {
          category: string;
          created_at: string;
          estimated_duration_min: number;
          focus: string;
          id: string;
          is_active: boolean;
          slug: string;
          structure: Json;
          title: string;
          updated_at: string;
        };
      };
    };
  };
};
