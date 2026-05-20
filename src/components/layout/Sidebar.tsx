import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useMembers } from '../../application/useMembers';

type Page = 'dashboard' | 'tasks' | 'log' | 'analytics' | 'members';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems: { id: Page; icon: string; label: string; section?: string }[] = [
  { id: 'dashboard', icon: '⬡', label: 'Dashboard',       section: 'Principal' },
  { id: 'tasks',     icon: '✓', label: 'Tareas',          section: 'Gestión' },
  { id: 'log',       icon: '♥', label: 'Tiempo Familiar' },
  { id: 'analytics', icon: '◈', label: 'Analytics' },
  { id: 'members',   icon: '◎', label: 'Miembros',        section: 'Configuración' },
];

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  const { familyId, familyName } = useApp();
  const { currentMember, logout, isAdmin } = useAuth();
  const { data: members } = useMembers(familyId);

  let lastSection = '';

  return (
    <>
      <div className={`sidebar-overlay${isOpen ? ' open' : ''}`} onClick={onClose} />
      <aside className={`sidebar${isOpen ? ' open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏠</div>
          <div>
            <div className="sidebar-logo-text">Familia App</div>
            <div className="sidebar-logo-sub">GESTIÓN · HOGAR</div>
          </div>
        </div>

        {/* Current member chip */}
        {currentMember && (
          <div className="sidebar-member-chip">
            <span className="sidebar-member-emoji">{currentMember.avatar_emoji}</span>
            <span className="sidebar-member-chip-name">{currentMember.name}</span>
            {isAdmin && <span className="sidebar-member-crown" title="Administrador">👑</span>}
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(item => {
            // Non-admin members don't need Analytics or Members pages
            const hidden = !isAdmin && (item.id === 'analytics' || item.id === 'members');
            if (hidden) return null;

            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;
            return (
              <React.Fragment key={item.id}>
                {showSection && <div className="sidebar-section-label">{item.section}</div>}
                <button
                  className={`nav-item${currentPage === item.id ? ' active' : ''}`}
                  onClick={() => { onNavigate(item.id); onClose(); }}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                >
                  <span style={{ fontSize: '1rem', width: 18, textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          {members && members.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
              {members.slice(0, 5).map(m => (
                <div key={m.id} className={`avatar avatar-sm${m.id === currentMember?.id ? ' selected' : ''}`}
                  title={m.name} style={{ fontSize: '0.9rem' }}>
                  {m.avatar_emoji}
                </div>
              ))}
            </div>
          )}
          <button
            className="sidebar-family-selector"
            onClick={() => { onNavigate('members'); onClose(); }}
            id="family-selector-btn"
          >
            <span>🏡</span>
            <span className="sidebar-family-name">{familyName || 'Seleccionar familia'}</span>
          </button>
          {/* Logout */}
          <button
            className="sidebar-logout-btn"
            onClick={() => { logout(); onClose(); }}
            id="logout-btn"
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
