// ============================================================
// Application Hooks — useTasks
// Capa de casos de uso: orquesta Domain + Infrastructure
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchTasksForFamily } from '../infrastructure/supabaseClient';
import type { Task, TaskStatus } from '../domain/types';

export function useTasks(familyId: string | null) {
  return useQuery({
    queryKey: ['tasks', familyId],
    queryFn: () => fetchTasksForFamily(familyId!),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 2, // 2 min cache
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks', data.family_id] });
    },
  });
}

/** Update all editable fields of an existing task */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Partial<Task> & { id: string; family_id: string }) => {
      const { id, family_id, created_at: _c, ...updates } = task as Task;
      const { error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { id, family_id };
    },
    onSuccess: ({ family_id }) => {
      qc.invalidateQueries({ queryKey: ['tasks', family_id] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, familyId }: { id: string; status: TaskStatus; familyId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { id, status, familyId };
    },
    onSuccess: ({ familyId }) => {
      qc.invalidateQueries({ queryKey: ['tasks', familyId] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return { familyId };
    },
    onSuccess: ({ familyId }) => {
      qc.invalidateQueries({ queryKey: ['tasks', familyId] });
    },
  });
}

/**
 * Award points to a member when a task is marked completed.
 * Points: 10 per task completed.
 */
export function useAwardPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, familyId, points = 10 }: { memberId: string; familyId: string; points?: number }) => {
      const { error } = await supabase.rpc('increment_member_points', {
        p_member_id: memberId,
        p_points: points,
      });
      if (error) {
        // Graceful fallback: do a manual increment
        const { data: member, error: fetchErr } = await supabase
          .from('members')
          .select('points_accumulated')
          .eq('id', memberId)
          .single();
        if (fetchErr) throw fetchErr;
        const { error: updateErr } = await supabase
          .from('members')
          .update({ points_accumulated: (member.points_accumulated ?? 0) + points })
          .eq('id', memberId);
        if (updateErr) throw updateErr;
      }
      return { memberId, familyId };
    },
    onSuccess: ({ familyId }) => {
      qc.invalidateQueries({ queryKey: ['members', familyId] });
    },
  });
}
