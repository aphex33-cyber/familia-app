// ============================================================
// Harmony Engine — Motor de Calificación Familiar
// Función pura: f(input) → HarmonyResult
// Sin efectos secundarios ni dependencias externas
// ============================================================

import type { HarmonyResult, HarmonyRating } from './types';

interface HarmonyInput {
  /** Tareas completadas en la semana */
  tasksCompleted: number;
  /** Total de tareas programadas en la semana */
  tasksTotal: number;
  /** Minutos de tiempo familiar acumulados en la semana */
  familyTimeMinutes: number;
  /** Objetivo semanal de tiempo familiar en minutos (default: 300 = 5 horas) */
  familyTimeGoalMinutes?: number;
}

const TASK_WEIGHT = 0.6;
const TIME_WEIGHT = 0.4;
const DEFAULT_GOAL_MINUTES = 300;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function getRating(score: number): HarmonyRating {
  if (score < 40) return 'critical';
  if (score < 60) return 'regular';
  if (score < 80) return 'good';
  return 'excellent';
}

function getRatingLabel(rating: HarmonyRating): string {
  const labels: Record<HarmonyRating, string> = {
    critical: 'Crítico',
    regular: 'Regular',
    good: 'Bueno',
    excellent: 'Excelente',
  };
  return labels[rating];
}

/**
 * Calcula el Score de Armonía Familiar.
 * - 60% peso: % de cumplimiento de tareas
 * - 40% peso: tiempo familiar vs. objetivo semanal
 */
export function calculateHarmony(input: HarmonyInput): HarmonyResult {
  const {
    tasksCompleted,
    tasksTotal,
    familyTimeMinutes,
    familyTimeGoalMinutes = DEFAULT_GOAL_MINUTES,
  } = input;

  const taskRatio = tasksTotal > 0 ? tasksCompleted / tasksTotal : 0;
  const timeRatio = familyTimeGoalMinutes > 0
    ? familyTimeMinutes / familyTimeGoalMinutes
    : 0;

  const taskScore = clamp(taskRatio * 100) * TASK_WEIGHT;
  const timeScore = clamp(timeRatio * 100) * TIME_WEIGHT;
  const score = Math.round(taskScore + timeScore);

  const rating = getRating(score);

  return {
    score,
    rating,
    task_weight: Math.round(taskRatio * 100),
    time_weight: Math.round(clamp(timeRatio * 100)),
    label: getRatingLabel(rating),
  };
}

export function getHarmonyColor(rating: HarmonyRating): string {
  const colors: Record<HarmonyRating, string> = {
    critical: '#FF4757',
    regular: '#FFA502',
    good: '#2ED573',
    excellent: '#00D4AA',
  };
  return colors[rating];
}
