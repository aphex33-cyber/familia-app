// ============================================================
// Application Hooks — useScorecard
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchWeeklyScorecards } from '../infrastructure/supabaseClient';
import type { WeeklyScorecard } from '../domain/types';

export function useWeeklyScorecards(familyId: string | null, weeksBack = 8) {
  return useQuery({
    queryKey: ['scorecard', familyId, weeksBack],
    queryFn: () => fetchWeeklyScorecards(familyId!, weeksBack),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Upsert (insert or update) a weekly scorecard row.
 * Unique constraint: (member_id, family_id, week_start)
 */
export function useUpsertScorecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<WeeklyScorecard, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('weekly_scorecard')
        .upsert([row], { onConflict: 'member_id,family_id,week_start' })
        .select()
        .single();
      if (error) throw error;
      return data as WeeklyScorecard;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scorecard', data.family_id] });
    },
  });
}
