// ============================================================
// Application Hooks — useTaskCompletions
// Daily independent task completion tracking (one record per task per day)
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../infrastructure/supabaseClient';
import type { TaskCompletion } from '../domain/types';

/** Returns today's date as 'YYYY-MM-DD' in local timezone */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Fetch all completion records for the family on a given date (defaults to today) */
export function useTaskCompletions(familyId: string | null, date?: string) {
  const targetDate = date ?? todayISO();
  return useQuery({
    queryKey: ['task_completions', familyId, targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_completions')
        .select('*')
        .eq('family_id', familyId!)
        .eq('date', targetDate);
      if (error) throw error;
      return (data ?? []) as TaskCompletion[];
    },
    enabled: !!familyId,
    staleTime: 1000 * 30, // 30s — fresh enough for task ticking
  });
}

/** Toggle a task completion for today: if exists → delete (undo); if not → insert */
export function useToggleCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      familyId,
      memberId,
      existingId,
    }: {
      taskId: string;
      familyId: string;
      memberId?: string;
      existingId?: string; // if provided, we're undoing
    }) => {
      const date = todayISO();
      if (existingId) {
        // Undo: remove completion
        const { error } = await supabase
          .from('task_completions')
          .delete()
          .eq('id', existingId);
        if (error) throw error;
      } else {
        // Mark complete: upsert
        const { error } = await supabase
          .from('task_completions')
          .upsert(
            [{ task_id: taskId, family_id: familyId, date, status: 'completed', member_id: memberId ?? null }],
            { onConflict: 'task_id,date' }
          );
        if (error) throw error;
      }
      return { familyId, date };
    },
    onSuccess: ({ familyId, date }) => {
      qc.invalidateQueries({ queryKey: ['task_completions', familyId, date] });
      qc.invalidateQueries({ queryKey: ['members', familyId] }); // for points refresh
    },
  });
}
