// ============================================================
// Supabase Client — Infrastructure Layer
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type {
  Family,
  FamilyMember,
  Task,
  FamilyLogEntry,
  WeeklyScorecard,
} from '../domain/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- Type helpers for Supabase ----
export type DbFamily = Family;
export type DbMember = FamilyMember;
export type DbTask = Task;
export type DbFamilyLog = FamilyLogEntry;
export type DbScorecard = WeeklyScorecard;

// ---- Query helpers ----

export async function fetchFamilies(): Promise<Family[]> {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMembers(familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTasksForFamily(familyId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFamilyLog(familyId: string, limit = 50): Promise<FamilyLogEntry[]> {
  const { data, error } = await supabase
    .from('family_log')
    .select('*')
    .eq('family_id', familyId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchWeeklyScorecards(
  familyId: string,
  weeksBack = 8
): Promise<WeeklyScorecard[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const { data, error } = await supabase
    .from('weekly_scorecard')
    .select('*')
    .eq('family_id', familyId)
    .gte('week_start', cutoff.toISOString().split('T')[0])
    .order('week_start', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
