// ============================================================
// Task Engine — Lógica de recurrencia y estados de tareas
// Función pura sin dependencias de UI ni infraestructura
// ============================================================

import type { Task, TaskFrequency } from './types';

/**
 * Determina si una tarea está programada para una fecha dada.
 */
export function isTaskScheduledForDate(task: Task, date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat

  switch (task.frequency as TaskFrequency) {
    case 'daily':
      return true;
    case 'weekly':
      // Por defecto lunes (1) si no hay días custom
      return dayOfWeek === 1;
    case 'custom':
      return (task.custom_days ?? []).includes(dayOfWeek);
    default:
      return false;
  }
}

/**
 * Filtra las tareas programadas para hoy.
 */
export function getTasksForToday(tasks: Task[]): Task[] {
  const today = new Date();
  return tasks.filter(task => isTaskScheduledForDate(task, today));
}

/**
 * Calcula el porcentaje de tareas completadas.
 */
export function getCompletionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

/**
 * Agrupa tareas por miembro asignado.
 */
export function groupTasksByMember(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.assigned_to;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});
}

/**
 * Ordena tareas: pendientes primero, luego en progreso, luego completadas.
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  const order = { pending: 0, in_progress: 1, completed: 2, skipped: 3 };
  return [...tasks].sort((a, b) => order[a.status] - order[b.status]);
}

/**
 * Formato legible de frecuencia.
 */
export function formatFrequency(task: Task): string {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  switch (task.frequency) {
    case 'daily': return 'Todos los días';
    case 'weekly': return 'Semanal';
    case 'custom': {
      const days = (task.custom_days ?? []).map(d => dayNames[d]);
      return days.join(', ');
    }
    default: return task.frequency;
  }
}
