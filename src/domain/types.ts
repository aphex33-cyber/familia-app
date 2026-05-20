// ============================================================
// Domain Types — App de Gestión Familiar
// Sin dependencias de UI ni infraestructura
// ============================================================

export type MemberRole = 'admin' | 'user';

export interface FamilyMember {
  id: string;
  name: string;
  avatar_emoji: string;
  role: MemberRole;
  points_accumulated: number;
  family_id: string;
  created_at: string;
  pin?: string; // 4-digit PIN for local session login
}

export type TaskFrequency = 'daily' | 'weekly' | 'custom';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface Task {
  id: string;
  description: string;
  frequency: TaskFrequency;
  custom_days?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  assigned_to: string;   // FamilyMember.id
  alarm_time?: string;   // HH:MM
  status: TaskStatus;
  family_id: string;
  created_at: string;
  updated_at: string;
}

export type ActivityType =
  | 'prayer'
  | 'dinner'
  | 'movie'
  | 'game'
  | 'walk'
  | 'reading'
  | 'other';

export interface FamilyLogEntry {
  id: string;
  activity_type: ActivityType;
  duration_minutes: number;
  member_ids: string[];
  notes?: string;
  family_id: string;
  logged_at: string;
}

export interface WeeklyScorecard {
  id: string;
  member_id: string;
  family_id: string;
  week_start: string; // ISO date Monday
  tasks_completed: number;
  tasks_total: number;
  family_time_minutes: number;
  harmony_score: number; // 0–100
  created_at: string;
}

// ---- Harmony Score output ----
export type HarmonyRating = 'critical' | 'regular' | 'good' | 'excellent';

export interface HarmonyResult {
  score: number;
  rating: HarmonyRating;
  task_weight: number;
  time_weight: number;
  label: string;
}

export interface Family {
  id: string;
  name: string;
  created_at: string;
}
