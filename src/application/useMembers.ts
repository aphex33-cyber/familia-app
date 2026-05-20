// ============================================================
// Application Hooks — useMembers / useFamily
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchMembers, fetchFamilies } from '../infrastructure/supabaseClient';
import type { FamilyMember, Family } from '../domain/types';

export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: fetchFamilies,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('families')
        .insert([{ name }])
        .select()
        .single();
      if (error) throw error;
      return data as Family;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  });
}

export function useMembers(familyId: string | null) {
  return useQuery({
    queryKey: ['members', familyId],
    queryFn: () => fetchMembers(familyId!),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: Omit<FamilyMember, 'id' | 'created_at' | 'points_accumulated'>) => {
      const { data, error } = await supabase
        .from('members')
        .insert([{ ...member, points_accumulated: 0 }])
        .select()
        .single();
      if (error) throw error;
      return data as FamilyMember;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['members', data.family_id] }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: Partial<FamilyMember> & { id: string; family_id: string }) => {
      const { id, family_id, ...updates } = member;
      const { error } = await supabase.from('members').update(updates).eq('id', id);
      if (error) throw error;
      return { family_id };
    },
    onSuccess: ({ family_id }) => qc.invalidateQueries({ queryKey: ['members', family_id] }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      return { familyId };
    },
    onSuccess: ({ familyId }) => qc.invalidateQueries({ queryKey: ['members', familyId] }),
  });
}
