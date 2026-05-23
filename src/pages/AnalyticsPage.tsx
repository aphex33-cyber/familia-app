import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useWeeklyScorecards, useUpsertScorecard } from '../application/useScorecard';
import { useFamilyLog } from '../application/useFamilyLog';
import { useTasks } from '../application/useTasks';
import { useMembers } from '../application/useMembers';
import { calculateHarmony, getHarmonyColor } from '../domain/harmony';
import type { HarmonyRating } from '../domain/types';

const WEEK_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Returns the ISO date string (YYYY-MM-DD) of the most recent Monday */
function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function BarChart({
  data,
  color,
  maxValue,
}: {
  data: { label: string; value: number }[];
  color: string;
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-val">{d.value > 0 ? d.value : ''}</div>
          <div className="bar-wrap">
            <div className="bar" style={{
              height: `${(d.value / max) * 100}%`,
              background: color,
              opacity: d.value > 0 ? 1 : 0.15,
            }} />
          </div>
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function KPICard({
  value, label, delta, deltaUp, color,
}: {
  value: string; label: string; delta?: string; deltaUp?: boolean; color?: string;
}) {
  return (
    <div className="glass-card kpi-card">
      <div className="kpi-value" style={{ color: color ?? 'var(--text-primary)' }}>{value}</div>
      <div className="kpi-label">{label}</div>
      {delta && <div className={`kpi-delta ${deltaUp ? 'up' : 'down'}`}>{deltaUp ? '↑' : '↓'} {delta}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { familyId, showToast } = useApp();
  const { data: scorecards = [] } = useWeeklyScorecards(familyId);
  const { data: logs = [] } = useFamilyLog(familyId);
  const { data: tasks = [] } = useTasks(familyId);
  const { data: members = [] } = useMembers(familyId);
  const upsertScorecard = useUpsertScorecard();
  const [savingScorecard, setSavingScorecard] = useState(false);

  // Last 7 days bar data (family time)
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toISOString().split('T')[0];
      const mins = logs.filter(l => l.logged_at.startsWith(dayStr)).reduce((s, l) => s + l.duration_minutes, 0);
      return { label: WEEK_LABELS[d.getDay()], value: mins };
    });
  }, [logs]);

  // Weekly task completion — last 4 weeks
  const weekTaskData = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 7);
      const weekTasks = tasks.filter(t => {
        const d = new Date(t.updated_at);
        return d >= weekStart && d < weekEnd;
      });
      const completed = weekTasks.filter(t => t.status === 'completed').length;
      return { label: `S-${i === 0 ? 'actual' : i}`, value: completed };
    }).reverse();
  }, [tasks]);

  // Harmony score chart (weekly)
  const harmonyHistory = useMemo(() => {
    if (scorecards.length === 0) return [];
    return scorecards.map(sc => ({
      label: new Date(sc.week_start).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
      value: Math.round(Number(sc.harmony_score)),
    }));
  }, [scorecards]);

  // Current week stats
  const weekAgo = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; }, []);
  const weekLogs = logs.filter(l => new Date(l.logged_at) >= weekAgo);
  const weekTasks = tasks.filter(t => new Date(t.updated_at) >= weekAgo);
  const weekMinutes = weekLogs.reduce((s, l) => s + l.duration_minutes, 0);
  const weekCompleted = weekTasks.filter(t => t.status === 'completed').length;

  const harmony = calculateHarmony({
    tasksCompleted: weekCompleted,
    tasksTotal: Math.max(weekTasks.length, 1),
    familyTimeMinutes: weekMinutes,
  });

  // Member leaderboard
  const memberStats = useMemo(() => members.map(m => {
    const mTasks = weekTasks.filter(t => t.assigned_to === m.id);
    const mCompleted = mTasks.filter(t => t.status === 'completed').length;
    const mTime = weekLogs.filter(l => l.member_ids.includes(m.id)).reduce((s, l) => s + l.duration_minutes, 0);
    const h = calculateHarmony({ tasksCompleted: mCompleted, tasksTotal: Math.max(mTasks.length, 1), familyTimeMinutes: mTime });
    return { ...m, completed: mCompleted, total: mTasks.length, time: mTime, score: h.score, rating: h.rating };
  }).sort((a, b) => b.score - a.score), [members, weekTasks, weekLogs]);

  /** Persist this week's scorecard for every member */
  const handleSaveScorecard = async () => {
    if (!familyId || members.length === 0) return;
    setSavingScorecard(true);
    const weekStart = getMondayISO();
    try {
      await Promise.all(memberStats.map(m =>
        upsertScorecard.mutateAsync({
          member_id: m.id,
          family_id: familyId,
          week_start: weekStart,
          tasks_completed: m.completed,
          tasks_total: m.total,
          family_time_minutes: m.time,
          harmony_score: m.score,
        })
      ));
      showToast({ type: 'success', title: '✅ Scorecard guardado', message: `Semana del ${weekStart}` });
    } catch {
      showToast({ type: 'error', title: 'Error al guardar scorecard' });
    } finally {
      setSavingScorecard(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics Familiar</div>
          <div className="page-subtitle">KPIs y scorecards — Semana actual</div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleSaveScorecard}
          disabled={savingScorecard || members.length === 0}
          id="save-scorecard-btn"
        >
          {savingScorecard ? '⏳ Guardando...' : '💾 Guardar Scorecard'}
        </button>
      </div>

      {/* KPI Row — 4 columns on desktop */}
      <div className="kpi-grid kpi-grid-4">
        <KPICard
          value={`${harmony.score}`}
          label="Armonía Familiar"
          color={getHarmonyColor(harmony.rating)}
          delta={harmony.label}
          deltaUp={harmony.score >= 60}
        />
        <KPICard
          value={`${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`}
          label="Tiempo Familiar"
          color="var(--secondary)"
        />
        <KPICard
          value={`${weekCompleted}`}
          label="Tareas Completadas"
          color="var(--accent-green)"
        />
        <KPICard
          value={`${logs.length}`}
          label="Actividades Totales"
          color="var(--primary-light)"
        />
      </div>

      <div className="analytics-grid">
        {/* Family Time Chart */}
        <div className="glass-card analytics-card">
          <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Tiempo Familiar — Últimos 7 días</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-mono)' }}>
            Total: {weekMinutes} min · Objetivo: 300 min
          </div>
          <div className="chart-container">
            <BarChart data={last7Days} color="linear-gradient(180deg, var(--secondary), var(--secondary-glow))" />
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{
                width: `${Math.min((weekMinutes / 300) * 100, 100)}%`,
                background: 'linear-gradient(90deg, var(--secondary), var(--primary))',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)', fontFamily: 'var(--font-mono)' }}>
              <span>{weekMinutes} min alcanzados</span><span>Meta: 300 min</span>
            </div>
          </div>
        </div>

        {/* Task Completion Chart */}
        <div className="glass-card analytics-card">
          <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Tareas Completadas — Últimas 4 semanas</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Historial de cumplimiento</div>
          <div className="chart-container">
            <BarChart data={weekTaskData} color="linear-gradient(180deg, var(--primary), var(--primary-glow))" />
          </div>
        </div>

        {/* Harmony History Chart (from persisted scorecards) */}
        {harmonyHistory.length > 0 && (
          <div className="glass-card analytics-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Historial de Armonía — Scorecards guardados</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Evolución del score semanal · /100
            </div>
            <div className="chart-container">
              <BarChart
                data={harmonyHistory}
                color={`linear-gradient(180deg, ${getHarmonyColor(harmony.rating)}, transparent)`}
                maxValue={100}
              />
            </div>
          </div>
        )}

        {/* Member Leaderboard */}
        <div className="glass-card analytics-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Ranking Familiar — Esta semana</div>
          {memberStats.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sin datos de miembros aún.</div>
          ) : (
            <table className="scorecard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Miembro</th>
                  <th>Tareas</th>
                  <th>Tiempo Familiar</th>
                  <th>Score Armonía</th>
                  <th>Rating</th>
                  <th style={{ fontFamily: 'var(--font-mono)' }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map((m, i) => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: 700 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div className="avatar avatar-sm">{m.avatar_emoji}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.role === 'admin' ? 'Admin' : 'Usuario'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--accent-green)' }}>{m.completed}</span>
                      <span style={{ color: 'var(--text-muted)' }}>/{m.total}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>{m.time} min</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: getHarmonyColor(m.rating as HarmonyRating) }}>
                        {m.score}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${m.rating === 'excellent' ? 'secondary' : m.rating === 'good' ? 'green' : m.rating === 'regular' ? 'amber' : 'red'}`}>
                        {m.rating === 'excellent' ? 'Excelente' : m.rating === 'good' ? 'Bueno' : m.rating === 'regular' ? 'Regular' : 'Crítico'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', fontWeight: 700 }}>
                      {m.points_accumulated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
