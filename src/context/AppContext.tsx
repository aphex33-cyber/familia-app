import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface AppContextValue {
  familyId: string | null;
  familyName: string | null;
  setFamily: (id: string, name: string) => void;
  clearFamily: () => void;
  /** @deprecated Use setFamily instead */
  setFamilyId: (id: string | null) => void;
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [familyId, setFamilyIdState] = useState<string | null>(
    () => localStorage.getItem('familia_app_family_id')
  );
  const [familyName, setFamilyNameState] = useState<string | null>(
    () => localStorage.getItem('familia_app_family_name')
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  const setFamily = useCallback((id: string, name: string) => {
    setFamilyIdState(id);
    setFamilyNameState(name);
    localStorage.setItem('familia_app_family_id', id);
    localStorage.setItem('familia_app_family_name', name);
  }, []);

  const clearFamily = useCallback(() => {
    setFamilyIdState(null);
    setFamilyNameState(null);
    localStorage.removeItem('familia_app_family_id');
    localStorage.removeItem('familia_app_family_name');
  }, []);

  // Backward compat shim
  const setFamilyId = useCallback((id: string | null) => {
    if (id) {
      setFamilyIdState(id);
      localStorage.setItem('familia_app_family_id', id);
    } else {
      clearFamily();
    }
  }, [clearFamily]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <AppContext.Provider value={{ familyId, familyName, setFamily, clearFamily, setFamilyId, toasts, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
