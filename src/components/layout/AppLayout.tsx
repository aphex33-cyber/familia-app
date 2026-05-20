import React, { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import ToastContainer from '../ui/ToastContainer';

type Page = 'dashboard' | 'tasks' | 'log' | 'analytics' | 'members';

const pageTitles: Record<Page, { title: string; subtitle: string }> = {
  dashboard:  { title: 'Dashboard', subtitle: 'Vista general de tu hogar' },
  tasks:      { title: 'Tareas del Hogar', subtitle: 'Domestic Engine — Rutinas y responsabilidades' },
  log:        { title: 'Tiempo de Calidad', subtitle: 'Registra momentos especiales en familia' },
  analytics:  { title: 'Analytics', subtitle: 'KPIs y scorecards de desempeño familiar' },
  members:    { title: 'Miembros', subtitle: 'Gestión de perfiles de la familia' },
};

interface AppLayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export default function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = pageTitles[currentPage];

  return (
    <div className="app-shell">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        {/* TopBar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              id="mobile-menu-btn"
            >
              ☰
            </button>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{meta.title}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <div style={{
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
            }}>
              {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-container">
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
