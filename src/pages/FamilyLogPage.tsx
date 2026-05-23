import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useFamilyLog, useCreateLogEntry, useDeleteLogEntry } from '../application/useFamilyLog';
import { useMembers } from '../application/useMembers';
import type { ActivityType } from '../domain/types';

const ACTIVITIES: { id: ActivityType; emoji: string; label: string }[] = [
  { id: 'prayer',  emoji: '🙏', label: 'Oración' },
  { id: 'dinner',  emoji: '🍽️', label: 'Cena' },
  { id: 'movie',   emoji: '🎬', label: 'Película' },
  { id: 'game',    emoji: '🎮', label: 'Juego' },
  { id: 'walk',    emoji: '🚶', label: 'Paseo' },
  { id: 'reading', emoji: '📚', label: 'Lectura' },
  { id: 'other',   emoji: '⭐', label: 'Otro' },
];

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function FamilyLogPage() {
  const { familyId, showToast } = useApp();
  const { data: logs = [], isLoading } = useFamilyLog(familyId);
  const { data: members = [] } = useMembers(familyId);
  const createEntry = useCreateLogEntry();
  const deleteEntry = useDeleteLogEntry();

  const [activity, setActivity] = useState<ActivityType>('dinner');
  const [activityLabel, setActivityLabel] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const [manualMinutes, setManualMinutes] = useState('');

  // ── Timer: timestamp-based (survives screen-off) ──────────────────────────
  const [elapsed, setElapsed] = useState(0);       // accumulated seconds
  const [running, setRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null); // Date.now() when last started
  const savedElapsedRef = useRef(0);                // seconds saved before last pause
  const rafRef = useRef<number | null>(null);

  const tick = () => {
    if (startTimeRef.current !== null) {
      const nowElapsed = savedElapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(nowElapsed);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (startTimeRef.current !== null) {
        // Save elapsed before pause
        savedElapsedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
        startTimeRef.current = null;
        setElapsed(savedElapsedRef.current);
      }
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Page Visibility API — recalculate when app comes back to foreground
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && running && startTimeRef.current !== null) {
        const nowElapsed = savedElapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(nowElapsed);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [running]);

  const resetTimer = () => {
    setRunning(false);
    setElapsed(0);
    savedElapsedRef.current = 0;
    startTimeRef.current = null;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const toggleMember = (id: string) =>
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const membersMap = useMemo(() =>
    members.reduce<Record<string, typeof members[0]>>((a, m) => { a[m.id] = m; return a; }, {}), [members]);

  const handleSave = async () => {
    const duration = mode === 'timer' ? Math.floor(elapsed / 60) : parseInt(manualMinutes, 10);
    if (!duration || duration < 1) { showToast({ type: 'error', title: 'Duración inválida', message: 'Mínimo 1 minuto' }); return; }
    if (selectedMembers.length === 0) { showToast({ type: 'error', title: 'Selecciona al menos un miembro' }); return; }
    if (!familyId) return;
    if (activity === 'other' && !activityLabel.trim()) {
      showToast({ type: 'error', title: 'Describe la actividad', message: 'El campo etiqueta es requerido para "Otro"' });
      return;
    }
    try {
      await createEntry.mutateAsync({
        activity_type: activity,
        activity_label: activity === 'other' ? activityLabel.trim() : undefined,
        duration_minutes: duration,
        member_ids: selectedMembers,
        notes: notes.trim() || undefined,
        family_id: familyId,
        logged_at: new Date().toISOString(),
      });
      resetTimer();
      setNotes('');
      setManualMinutes('');
      setActivityLabel('');
      const label = activity === 'other' ? activityLabel.trim() : ACTIVITIES.find(a => a.id === activity)?.label;
      showToast({ type: 'success', title: 'Actividad registrada 🎉', message: `${duration} min de ${label}` });
    } catch {
      showToast({ type: 'error', title: 'Error al guardar' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!familyId) return;
    try { await deleteEntry.mutateAsync({ id, familyId }); }
    catch { showToast({ type: 'error', title: 'Error al eliminar' }); }
  };

  const totalWeekMin = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return logs.filter(l => new Date(l.logged_at) >= weekAgo).reduce((s, l) => s + l.duration_minutes, 0);
  }, [logs]);

  return (
    <div className="log-layout">
      {/* LEFT: Logger */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="page-title">Registrar Actividad</div>
            <div className="page-subtitle">Esta semana: <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Math.floor(totalWeekMin / 60)}h {totalWeekMin % 60}min</span></div>
          </div>
        </div>

        {/* Activity Type */}
        <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-4)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>TIPO DE ACTIVIDAD</div>
          <div className="activity-types-grid">
            {ACTIVITIES.map(a => (
              <button key={a.id} className={`activity-type-btn${activity === a.id ? ' selected' : ''}`}
                onClick={() => { setActivity(a.id); setActivityLabel(''); }} id={`activity-${a.id}`}>
                <span className="activity-emoji">{a.emoji}</span>
                {a.label}
              </button>
            ))}
          </div>
          {/* Custom label for "Otro" */}
          {activity === 'other' && (
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label" htmlFor="activity-label">¿Qué actividad fue? *</label>
              <input
                id="activity-label"
                className="form-input"
                value={activityLabel}
                onChange={e => setActivityLabel(e.target.value)}
                placeholder="ej. Cumpleaños, Excursión, Ejercicio..."
                maxLength={50}
              />
            </div>
          )}
        </div>

        {/* Members */}
        <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-4)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>MIEMBROS PRESENTES</div>
          {members.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sin miembros. Agrégalos en la sección Miembros.</div>
          ) : (
            <div className="member-selector">
              {members.map(m => (
                <button key={m.id} className="member-select-btn" onClick={() => toggleMember(m.id)} id={`log-member-${m.id}`}>
                  <div className={`avatar avatar-lg${selectedMembers.includes(m.id) ? ' selected' : ''}`}>{m.avatar_emoji}</div>
                  <span className="member-select-name" style={{ color: selectedMembers.includes(m.id) ? 'var(--primary-light)' : undefined }}>{m.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timer / Manual */}
        <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <button className={`filter-btn${mode === 'timer' ? ' active' : ''}`} onClick={() => setMode('timer')}>⏱ Cronómetro</button>
            <button className={`filter-btn${mode === 'manual' ? ' active' : ''}`} onClick={() => setMode('manual')}>✏️ Manual</button>
          </div>
          {mode === 'timer' ? (
            <>
              <div className="timer-display">{formatTime(elapsed)}</div>
              <div className="timer-controls">
                <button className="btn btn-secondary" onClick={resetTimer} id="timer-reset">↺ Reset</button>
                <button className={`btn ${running ? 'btn-danger' : 'btn-primary'}`} onClick={() => setRunning(r => !r)} id="timer-toggle">
                  {running ? '⏸ Pausar' : '▶ Iniciar'}
                </button>
              </div>
            </>
          ) : (
            <div className="form-group" style={{ maxWidth: 200, margin: '0 auto' }}>
              <label className="form-label">Minutos</label>
              <input id="manual-minutes" type="number" className="form-input" min={1} max={480}
                value={manualMinutes} onChange={e => setManualMinutes(e.target.value)}
                placeholder="ej. 45" style={{ textAlign: 'center', fontSize: '1.5rem', fontFamily: 'var(--font-mono)' }} />
            </div>
          )}
        </div>

        {/* Notes & Save */}
        <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="log-notes">Notas (opcional)</label>
            <textarea id="log-notes" className="form-textarea" value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="¿Algo especial que recordar?" />
          </div>
          <button className="btn btn-primary w-full" style={{ marginTop: 'var(--space-4)' }}
            onClick={handleSave} disabled={createEntry.isPending} id="save-log-btn">
            {createEntry.isPending ? 'Guardando...' : '💾 Registrar Actividad'}
          </button>
        </div>
      </div>

      {/* RIGHT: History */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Historial</div>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ♥ Registra tu primera actividad familiar
          </div>
        ) : (
          <div className="log-history-list">
            {logs.map(log => {
              const act = ACTIVITIES.find(a => a.id === log.activity_type);
              const displayLabel = log.activity_label || act?.label || log.activity_type;
              return (
                <div key={log.id} className="glass-card log-history-item">
                  <div style={{ fontSize: '1.5rem' }}>{act?.emoji ?? '⭐'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{displayLabel}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {log.member_ids.map(id => membersMap[id]?.avatar_emoji ?? '👤').join(' ')} ·{' '}
                      {new Date(log.logged_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {log.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.notes}</div>}
                  </div>
                  <div className="log-item-duration">{log.duration_minutes}m</div>
                  <button className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}
                    onClick={() => handleDelete(log.id)} id={`delete-log-${log.id}`} title="Eliminar">✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
