/**
 * SetupPage — Pantalla de bienvenida / primer acceso
 * - Si ya existe "Mi Familia" en Supabase → muestra opción de unirse
 * - Si no existe → muestra el formulario de creación
 */
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../infrastructure/supabaseClient';

interface FamilyRow { id: string; name: string; }

const SEED_MEMBERS = [
  { name: 'Papá', avatar_emoji: '👨', role: 'admin' as const, pin: '2222' },
  { name: 'Mamá', avatar_emoji: '👩', role: 'user'  as const, pin: '1111' },
  { name: 'Sigi', avatar_emoji: '👧', role: 'user'  as const, pin: '3333' },
  { name: 'Sito', avatar_emoji: '👦', role: 'user'  as const, pin: '4444' },
  { name: 'Vale', avatar_emoji: '🌟', role: 'user'  as const, pin: '5555' },
];

const SEED_TASKS = (memberMap: Record<string, string>, familyId: string) => [
  { description: 'Lavar platos (3 tiempos)', frequency: 'custom', custom_days: [1, 5], assigned_to: memberMap['Papá'], status: 'pending', family_id: familyId },
  { description: 'Sacar la basura',          frequency: 'custom', custom_days: [2, 4], assigned_to: memberMap['Papá'], status: 'pending', family_id: familyId },
  { description: 'Barrer',                   frequency: 'custom', custom_days: [2, 6], assigned_to: memberMap['Papá'], status: 'pending', family_id: familyId },
  { description: 'Preparar comidas',          frequency: 'custom', custom_days: [1, 2, 3, 4, 5], assigned_to: memberMap['Mamá'], status: 'pending', family_id: familyId },
  { description: 'Preparar comidas',          frequency: 'custom', custom_days: [6],    assigned_to: memberMap['Vale'], status: 'pending', family_id: familyId },
  { description: 'Lavar platos (3 tiempos)', frequency: 'custom', custom_days: [2],    assigned_to: memberMap['Vale'], status: 'pending', family_id: familyId },
  { description: 'Preparar comida',           frequency: 'custom', custom_days: [0],    assigned_to: memberMap['Sigi'], status: 'pending', family_id: familyId },
  { description: 'Lavar platos (3 tiempos)', frequency: 'custom', custom_days: [3],    assigned_to: memberMap['Sigi'], status: 'pending', family_id: familyId },
];

export default function SetupPage() {
  const { setFamily } = useApp();
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [creating, setCreating] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  // Load existing families on mount
  useEffect(() => {
    supabase.from('families').select('id, name').order('created_at')
      .then(({ data }) => { setFamilies(data ?? []); setLoadingFamilies(false); });
  }, []);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const handleJoin = (f: FamilyRow) => setFamily(f.id, f.name);

  const handleCreate = async () => {
    setCreating(true);
    setLog([]);
    setStatus('running');
    try {
      addLog('🏡 Creando familia "Mi Familia"...');
      const { data: family, error: famErr } = await supabase
        .from('families').insert([{ name: 'Mi Familia' }]).select().single();
      if (famErr) throw famErr;
      const fid = family.id;
      addLog(`   ✅ Familia creada`);

      addLog('👥 Creando miembros...');
      const { data: members, error: memErr } = await supabase
        .from('members')
        .insert(SEED_MEMBERS.map(m => ({ ...m, family_id: fid, points_accumulated: 0 })))
        .select();
      if (memErr) throw memErr;

      const memberMap: Record<string, string> = {};
      (members ?? []).forEach(m => { memberMap[m.name] = m.id; });
      SEED_MEMBERS.forEach(m => addLog(`   ✅ ${m.avatar_emoji} ${m.name} (PIN: ${m.pin})`));

      addLog('📋 Creando tareas...');
      const { error: taskErr } = await supabase.from('tasks').insert(SEED_TASKS(memberMap, fid));
      if (taskErr) throw taskErr;
      addLog('   ✅ 8 tareas creadas');
      addLog('');
      addLog('🎉 ¡Listo! Conectando...');
      setStatus('done');
      setTimeout(() => setFamily(fid, 'Mi Familia'), 1200);
    } catch (e: unknown) {
      addLog(`❌ ${e instanceof Error ? e.message : String(e)}`);
      setStatus('error');
    }
    setCreating(false);
  };

  // ─── Join existing family view ──────────────────────────────────────────────
  if (!loadingFamilies && families.length > 0 && status === 'idle') {
    return (
      <div className="login-screen">
        <div className="login-header">
          <div className="login-logo-icon">🏠</div>
          <h1 className="login-title">Familia App</h1>
          <p className="login-subtitle">Elige tu familia para comenzar</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%', maxWidth: 440 }}>
          {families.map(f => (
            <button
              key={f.id}
              className="login-member-card"
              style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 'var(--space-4)', padding: 'var(--space-5) var(--space-6)' }}
              onClick={() => handleJoin(f)}
              id={`join-family-${f.id}`}
            >
              <span style={{ fontSize: '2rem' }}>🏡</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{f.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Toca para entrar →</div>
              </div>
            </button>
          ))}
        </div>

        <button
          className="btn btn-ghost"
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
          onClick={() => setStatus('idle') /* show create below */}
          id="show-create-btn"
          /* We show the create option as an alternative */
          onClickCapture={() => setFamilies([])}
        >
          + Crear nueva familia
        </button>
      </div>
    );
  }

  // ─── Create new family view ─────────────────────────────────────────────────
  return (
    <div className="login-screen">
      <div className="login-header">
        <div className="login-logo-icon">🏠</div>
        <h1 className="login-title">Familia App</h1>
        <p className="login-subtitle">Primera vez — Configura tu familia</p>
      </div>

      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', maxWidth: 480, width: '100%', backdropFilter: 'blur(12px)' }}>
        {status === 'idle' && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)', lineHeight: 1.7 }}>
              Se crearán automáticamente <strong>5 miembros</strong> con sus tareas:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {SEED_MEMBERS.map(m => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg-glass)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{m.avatar_emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.role === 'admin' ? '👑 Admin' : 'Usuario'}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 700 }}>PIN: {m.pin}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreate} id="run-setup-btn">
              🚀 Crear Mi Familia
            </button>
          </>
        )}

        {(status === 'running' || status === 'done' || status === 'error') && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: l.startsWith('❌') ? 'var(--accent-red)' : l.startsWith('🎉') ? 'var(--secondary)' : 'var(--text-secondary)' }}>
                {l || <br />}
              </div>
            ))}
            {status === 'running' && <div style={{ color: 'var(--primary-light)' }}>⏳ Procesando...</div>}
            {status === 'error' && (
              <button className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }} onClick={() => { setStatus('idle'); setLog([]); }}>
                Intentar de nuevo
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 480, width: '100%', background: 'rgba(255,165,2,0.07)', border: '1px solid rgba(255,165,2,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', fontSize: '0.78rem', color: 'var(--accent-amber)' }}>
        <strong>⚠️ Para activar los PINs</strong>, ejecuta este SQL en Supabase:
        <div style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-base)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginTop: 'var(--space-3)', color: 'var(--text-primary)', fontSize: '0.75rem', userSelect: 'all' }}>
          ALTER TABLE members ADD COLUMN IF NOT EXISTS pin text DEFAULT '1234';
        </div>
      </div>
    </div>
  );
}
