import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember, useFamilies, useCreateFamily } from '../application/useMembers';
import Modal from '../components/ui/Modal';
import type { FamilyMember, MemberRole } from '../domain/types';

const EMOJI_OPTIONS = ['👨','👩','👦','👧','👴','👵','🧑','👶','🐱','🐶','🌟','🦁','🐼','🦊','🐸','🚀'];

function MemberForm({
  initial, familyId, onSave, onClose,
}: {
  initial?: Partial<FamilyMember>;
  familyId: string;
  onSave: (d: Omit<FamilyMember, 'id' | 'created_at' | 'points_accumulated'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<MemberRole>(initial?.role ?? 'user');
  const [emoji, setEmoji] = useState(initial?.avatar_emoji ?? '👤');

  return (
    <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; onSave({ name: name.trim(), role, avatar_emoji: emoji, family_id: familyId }); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="form-group">
        <label className="form-label">Avatar</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {EMOJI_OPTIONS.map(e => (
            <button type="button" key={e}
              className={`avatar avatar-md${emoji === e ? ' selected' : ''}`}
              style={{ cursor: 'pointer', fontSize: '1.25rem' }}
              onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="member-name">Nombre *</label>
        <input id="member-name" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="ej. Aaron" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="member-role">Rol</label>
        <select id="member-role" className="form-select" value={role} onChange={e => setRole(e.target.value as MemberRole)}>
          <option value="admin">Admin (Padres)</option>
          <option value="user">Usuario (Hijos)</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Guardar miembro</button>
      </div>
    </form>
  );
}

function FamilySetupModal({ onClose }: { onClose: () => void }) {
  const { familyId, setFamily, clearFamily } = useApp();
  const { data: families = [] } = useFamilies();
  const createFamily = useCreateFamily();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  return (
    <Modal title="Seleccionar Familia" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {families.map(f => (
          <button
            key={f.id}
            className={`family-option${familyId === f.id ? ' active' : ''}`}
            onClick={() => { setFamily(f.id, f.name); onClose(); }}
            id={`pick-family-${f.id}`}
          >
            <div className="avatar avatar-md">🏡</div>
            <div>
              <div className="family-option-name">{f.name}</div>
              <div className="family-option-sub">{familyId === f.id ? '✓ Familia activa' : 'Conectar a esta familia'}</div>
            </div>
          </button>
        ))}
        <div className="divider" />
        {creating ? (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <input
              id="new-family-name" className="form-input"
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Nombre de la familia" autoFocus
            />
            <button
              className="btn btn-primary"
              disabled={!newName.trim() || createFamily.isPending}
              onClick={async () => {
                const f = await createFamily.mutateAsync(newName.trim());
                setFamily(f.id, f.name);
                onClose();
              }}
            >
              {createFamily.isPending ? '...' : 'Crear'}
            </button>
          </div>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={() => setCreating(true)} id="new-family-btn">+ Nueva familia</button>
            {familyId && (
              <button className="btn btn-ghost" style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}
                onClick={() => { clearFamily(); onClose(); }}
              >✕ Desconectar familia</button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export default function MembersPage() {
  const { familyId, showToast } = useApp();
  const { data: members = [], isLoading } = useMembers(familyId);
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [showFamilyModal, setShowFamilyModal] = useState(false);

  const handleCreate = async (data: Omit<FamilyMember, 'id' | 'created_at' | 'points_accumulated'>) => {
    try {
      await createMember.mutateAsync(data);
      setShowAddModal(false);
      showToast({ type: 'success', title: 'Miembro agregado', message: data.name });
    } catch { showToast({ type: 'error', title: 'Error al agregar miembro' }); }
  };

  const handleUpdate = async (data: Omit<FamilyMember, 'id' | 'created_at' | 'points_accumulated'>) => {
    if (!editMember) return;
    try {
      await updateMember.mutateAsync({ ...data, id: editMember.id, family_id: editMember.family_id });
      setEditMember(null);
      showToast({ type: 'success', title: 'Miembro actualizado' });
    } catch { showToast({ type: 'error', title: 'Error al actualizar' }); }
  };

  const handleDelete = async (m: FamilyMember) => {
    if (!confirm(`¿Eliminar a ${m.name}?`)) return;
    try {
      await deleteMember.mutateAsync({ id: m.id, familyId: m.family_id });
      showToast({ type: 'success', title: 'Miembro eliminado' });
    } catch { showToast({ type: 'error', title: 'Error al eliminar' }); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Miembros de la Familia</div>
          <div className="page-subtitle">{members.length} {members.length === 1 ? 'miembro' : 'miembros'} registrados</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={() => setShowFamilyModal(true)} id="change-family-btn">🏡 Familia</button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} id="add-member-btn">+ Agregar Miembro</button>
        </div>
      </div>

      {!familyId ? (
        <div className="glass-card" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🏡</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>Selecciona tu familia</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)', fontSize: '0.875rem' }}>
            Empieza creando o seleccionando una familia para gestionar sus miembros.
          </div>
          <button className="btn btn-primary" onClick={() => setShowFamilyModal(true)} id="setup-family-btn">Configurar Familia</button>
        </div>
      ) : isLoading ? (
        <div className="members-grid">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 220 }} />)}
        </div>
      ) : members.length === 0 ? (
        <div className="glass-card" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>👥</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Agrega el primer miembro de tu familia.</div>
        </div>
      ) : (
        <div className="members-grid">
          {members.map(m => (
            <div key={m.id} className="glass-card member-card">
              <div className="member-card-avatar">
                <div className="avatar avatar-lg" style={{ margin: '0 auto' }}>{m.avatar_emoji}</div>
              </div>
              <div className="member-card-name">{m.name}</div>
              <div className="member-card-role">
                <span className={`badge ${m.role === 'admin' ? 'badge-primary' : 'badge-muted'}`}>
                  {m.role === 'admin' ? '👑 Admin' : '👤 Usuario'}
                </span>
              </div>
              <div className="member-card-points">{m.points_accumulated}</div>
              <div className="member-card-pts-label">puntos acumulados</div>
              <div className="member-card-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditMember(m)} id={`edit-member-${m.id}`}>✏️ Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m)} id={`delete-member-${m.id}`}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && familyId && (
        <Modal title="Nuevo Miembro" onClose={() => setShowAddModal(false)}>
          <MemberForm familyId={familyId} onSave={handleCreate} onClose={() => setShowAddModal(false)} />
        </Modal>
      )}
      {editMember && (
        <Modal title="Editar Miembro" onClose={() => setEditMember(null)}>
          <MemberForm familyId={editMember.family_id} initial={editMember} onSave={handleUpdate} onClose={() => setEditMember(null)} />
        </Modal>
      )}
      {showFamilyModal && <FamilySetupModal onClose={() => setShowFamilyModal(false)} />}
    </>
  );
}
