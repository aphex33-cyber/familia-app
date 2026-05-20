import React from 'react';
import { useApp } from '../../context/AppContext';

export default function ToastContainer() {
  const { toasts } = useApp();
  if (!toasts.length) return null;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ fontSize: '1.1rem' }}>{icons[t.type]}</span>
          <div>
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-msg">{t.message}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
