import React, { useState } from 'react';
import { useMembers } from '../application/useMembers';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { FamilyMember } from '../domain/types';

function PinKeypad({ member, onSuccess, onCancel }: {
  member: FamilyMember; onSuccess: () => void; onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const push = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (next === (member.pin ?? '1234')) {
        onSuccess();
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setPin(''); setShake(false); setError(false); }, 900);
      }
    }
  };

  return (
    <div className="pin-box">
      <div className="pin-avatar">{member.avatar_emoji}</div>
      <div className="pin-name">{member.name}</div>
      <div className={`pin-dots${shake ? ' shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`pin-dot${pin.length > i ? ' filled' : ''}${error ? ' error' : ''}`} />
        ))}
      </div>
      {error && <div className="pin-error-msg">PIN incorrecto, intenta de nuevo</div>}
      <div className="pin-keypad">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
          <button
            key={i}
            className={`pin-key${k === '' ? ' pin-key-empty' : ''}`}
            disabled={k === ''}
            onClick={() => k === '⌫' ? setPin(p => p.slice(0, -1)) : k && push(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <button className="btn btn-ghost" style={{ marginTop: 'var(--space-5)', color: 'var(--text-muted)', fontSize: '0.875rem' }} onClick={onCancel}>
        ← Cambiar perfil
      </button>
    </div>
  );
}

export default function LoginPage() {
  const { familyId, familyName } = useApp();
  const { data: members = [], isLoading } = useMembers(familyId);
  const { login } = useAuth();
  const [selected, setSelected] = useState<FamilyMember | null>(null);

  if (selected) {
    return (
      <div className="login-screen">
        <PinKeypad
          member={selected}
          onSuccess={() => login(selected)}
          onCancel={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-header">
        <div className="login-logo-icon">🏠</div>
        <h1 className="login-title">{familyName ?? 'Mi Familia'}</h1>
        <p className="login-subtitle">¿Quién eres hoy?</p>
      </div>

      {isLoading ? (
        <div className="login-members-grid">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : (
        <div className="login-members-grid">
          {members.map(m => (
            <button
              key={m.id}
              className="login-member-card"
              onClick={() => setSelected(m)}
              id={`login-${m.id}`}
            >
              <div className="login-member-avatar">{m.avatar_emoji}</div>
              <div className="login-member-name">{m.name}</div>
              {m.role === 'admin' && <div className="login-member-role">👑 Admin</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
