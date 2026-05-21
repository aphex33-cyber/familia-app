import React, { useMemo } from 'react';
import { useTasks } from '../application/useTasks';
import { useFamilyLog } from '../application/useFamilyLog';
import { useMembers } from '../application/useMembers';
import { useApp } from '../context/AppContext';
import { getTasksForToday, getCompletionRate, sortTasksByPriority } from '../domain/taskEngine';
import { calculateHarmony, getHarmonyColor } from '../domain/harmony';
import type { FamilyMember } from '../domain/types';

const ACTIVITY_EMOJI: Record<string, string> = {
  prayer: '🙏', dinner: '🍽️', movie: '🎬', game: '🎮', walk: '🚶', reading: '📚', other: '⭐',
};
const ACTIVITY_LABEL: Record<string, string> = {
  prayer: 'Oración', dinner: 'Cena', movie: 'Película', game: 'Juego', walk: 'Paseo', reading: 'Lectura', other: 'Actividad',
};

function MemberBar({ name, emoji, minutes, maxMinutes }: { name: string; emoji: string; minutes: number; maxMinutes: number }) {
  const pct = maxMinutes > 0 ? Math.round((minutes / maxMinutes) * 100) : 0;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <span style={{ fontSize: '1.2rem', minWidth: 28 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>{label}</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))', transition: 'width 0.6s ease' }} />
        </div>
      </div>
    </div>
  );
}

function HarmonyGauge({ score, rating, label }: { score: number; rating: string; label: string }) {
  const color = getHarmonyColor(rating as never);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="glass-card harmony-card">
      <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Armonía Familiar</div>
      <div className="harmony-gauge">
        <svg className="gauge-svg" viewBox="0 0 120 120">
          <circle className="gauge-track" cx="60" cy="60" r={r} />
          <circle
            className="gauge-fill"
            cx="60" cy="60" r={r}
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>
        <div className="gauge-center">
          <div className="gauge-score" style={{ color }}>{score}</div>
          <div className="gauge-label">/100</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
        <span className={`badge badge-${rating === 'excellent' ? 'secondary' : rating === 'good' ? 'green' : rating === 'regular' ? 'amber' : 'red'}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

function MiniCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const cells: (number | null)[] = [...Array(firstDay).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="glass-card mini-calendar">
      <div className="cal-header">
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
          {today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
        </span>
      </div>
      <div className="cal-grid">
        {dayNames.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`cal-day${d === today.getDate() ? ' today' : ''}${!d ? ' other-month' : ''}`}
          >
            {d ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { familyId } = useApp();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(familyId);
  const { data: logs = [] } = useFamilyLog(familyId);
  const { data: members = [] } = useMembers(familyId);

  const membersMap = useMemo(() => {
    return members.reduce<Record<string, FamilyMember>>((acc, m) => { acc[m.id] = m; return acc; }, {});
  }, [members]);

  const todayTasks = useMemo(() => sortTasksByPriority(getTasksForToday(tasks)), [tasks]);
  const completionRate = getCompletionRate(todayTasks);

  const weekMinutes = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return logs
      .filter(l => new Date(l.logged_at) >= weekAgo)
      .reduce((s, l) => s + l.duration_minutes, 0);
  }, [logs]);

  const weekTasks = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return tasks.filter(t => new Date(t.updated_at) >= weekAgo);
  }, [tasks]);

  const harmony = calculateHarmony({
    tasksCompleted: weekTasks.filter(t => t.status === 'completed').length,
    tasksTotal: Math.max(weekTasks.length, 1),
    familyTimeMinutes: weekMinutes,
  });

  const recentLogs = logs.slice(0, 4);
  const pendingCount = todayTasks.filter(t => t.status === 'pending').length;

  const firstName = members[0]?.name?.split(' ')[0] ?? 'Familia';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Hero Banner */}
      <div className="dashboard-hero">
        <div className="hero-greeting">👋 ¡Buen día, {firstName}!</div>
        <div className="hero-title">
          Tienes <span style={{ color: 'var(--secondary)' }}>{pendingCount} tareas</span> pendientes hoy
        </div>
        <div className="hero-subtitle">Centro de control familiar — {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">{completionRate}%</div>
            <div className="hero-stat-label">Completado hoy</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">{Math.round(weekMinutes / 60)}h</div>
            <div className="hero-stat-label">Tiempo familiar</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">{members.length}</div>
            <div className="hero-stat-label">Miembros activos</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value" style={{ color: getHarmonyColor(harmony.rating) }}>{harmony.score}</div>
            <div className="hero-stat-label">Score de armonía</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Harmony Gauge */}
        <HarmonyGauge score={harmony.score} rating={harmony.rating} label={harmony.label} />

        {/* Tasks Today */}
        <div className="glass-card tasks-today-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>Tareas de Hoy</span>
            <span className="badge badge-amber">{pendingCount} pendientes</span>
          </div>
          {tasksLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
            </div>
          ) : todayTasks.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)', fontSize: '0.875rem' }}>
              🎉 ¡Sin tareas por hoy!
            </div>
          ) : (
            <div className="tasks-today-list">
              {todayTasks.slice(0, 5).map(task => {
                const member = membersMap[task.assigned_to];
                return (
                  <div key={task.id} className="task-today-item">
                    <span className={`status-dot ${task.status}`} />
                    <div className="task-today-info">
                      <div className="task-today-name" style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none', color: task.status === 'completed' ? 'var(--text-muted)' : undefined }}>
                        {task.description}
                      </div>
                      <div className="task-today-meta">
                        {member ? `${member.avatar_emoji} ${member.name}` : '—'}
                        {task.alarm_time && ` · ⏰ ${task.alarm_time}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${completionRate}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
              />
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)', fontFamily: 'var(--font-mono)' }}>
              {completionRate}% completado
            </div>
          </div>
        </div>

        {/* Mini Calendar */}
        <MiniCalendar />

        {/* Recent Family Log */}
        <div className="glass-card log-preview-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Actividades Recientes</div>
          {recentLogs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aún no hay actividades registradas esta semana.</div>
          ) : (
            <div className="log-preview-list">
              {recentLogs.map(log => (
                <div key={log.id} className="log-preview-item">
                  <div className="log-activity-icon">{ACTIVITY_EMOJI[log.activity_type] ?? '⭐'}</div>
                  <div className="log-preview-info">
                    <div className="log-preview-type">{(log as {activity_label?: string}).activity_label || ACTIVITY_LABEL[log.activity_type] || log.activity_type}</div>
                    <div className="log-preview-meta">
                      {log.member_ids.map(id => membersMap[id]?.avatar_emoji ?? '👤').join(' ')} ·{' '}
                      {log.duration_minutes} min ·{' '}
                      {new Date(log.logged_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600 }}>
                    {log.duration_minutes} min
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Family Time Stats */}
      {members.length > 0 && logs.length > 0 && (() => {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const weekLogs = logs.filter(l => new Date(l.logged_at) >= weekAgo);
        
        // Minutes per member
        const memberMin: Record<string, number> = {};
        weekLogs.forEach(l => {
          l.member_ids.forEach(id => { memberMin[id] = (memberMin[id] ?? 0) + l.duration_minutes; });
        });
        const ranked = members
          .map(m => ({ ...m, minutes: memberMin[m.id] ?? 0 }))
          .filter(m => m.minutes > 0)
          .sort((a, b) => b.minutes - a.minutes);
        const maxMin = ranked[0]?.minutes ?? 1;

        // Most popular activity
        const actCount: Record<string, number> = {};
        weekLogs.forEach(l => { actCount[l.activity_type] = (actCount[l.activity_type] ?? 0) + 1; });
        const topActivity = Object.entries(actCount).sort((a, b) => b[1] - a[1])[0];

        if (ranked.length === 0) return null;
        return (
          <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>⏱ Participación Familiar esta semana</div>
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                {topActivity && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem' }}>{ACTIVITY_EMOJI[topActivity[0]] ?? '⭐'}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Favorita</div>
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--secondary)' }}>{weekLogs.length}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Sesiones</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary-light)' }}>{Math.round(weekMinutes / 60)}h</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total</div>
                </div>
              </div>
            </div>
            {ranked.map(m => (
              <MemberBar key={m.id} name={m.name.split(' ')[0]} emoji={m.avatar_emoji} minutes={m.minutes} maxMinutes={maxMin} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
