// ============================================================
// Application Hooks — useFamilyLog
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchFamilyLog } from '../infrastructure/supabaseClient';
import type { FamilyLogEntry } from '../domain/types';

export function useFamilyLog(familyId: string | null) {
  return useQuery({
    queryKey: ['family_log', familyId],
    queryFn: () => fetchFamilyLog(familyId!),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateLogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<FamilyLogEntry, 'id'>) => {
      const { data, error } = await supabase
        .from('family_log')
        .insert([entry])
        .select()
        .single();
      if (error) throw error;
      return data as FamilyLogEntry;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['family_log', data.family_id] });
      qc.invalidateQueries({ queryKey: ['scorecard', data.family_id] });
    },
  });
}

export function useDeleteLogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from('family_log').delete().eq('id', id);
      if (error) throw error;
      return { familyId };
    },
    onSuccess: ({ familyId }) => {
      qc.invalidateQueries({ queryKey: ['family_log', familyId] });
    },
  });
}
