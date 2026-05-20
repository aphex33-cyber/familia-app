import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { FamilyMember } from '../domain/types';

interface AuthContextValue {
  currentMember: FamilyMember | null;
  login: (member: FamilyMember) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentMember, setCurrentMemberState] = useState<FamilyMember | null>(() => {
    try {
      const s = sessionStorage.getItem('familia_member');
      return s ? (JSON.parse(s) as FamilyMember) : null;
    } catch { return null; }
  });

  const login = useCallback((member: FamilyMember) => {
    setCurrentMemberState(member);
    sessionStorage.setItem('familia_member', JSON.stringify(member));
  }, []);

  const logout = useCallback(() => {
    setCurrentMemberState(null);
    sessionStorage.removeItem('familia_member');
  }, []);

  return (
    <AuthContext.Provider value={{
      currentMember,
      login,
      logout,
      isAdmin: currentMember?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
