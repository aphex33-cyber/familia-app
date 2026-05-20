import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import FamilyLogPage from './pages/FamilyLogPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MembersPage from './pages/MembersPage';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import './styles/index.css';
import './styles/layout.css';
import './styles/pages.css';

type Page = 'dashboard' | 'tasks' | 'log' | 'analytics' | 'members';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AppInner() {
  const [page, setPage] = useState<Page>('dashboard');
  const { familyId } = useApp();
  const { currentMember } = useAuth();

  // No family → first-time setup
  if (!familyId) return <SetupPage />;

  // Family selected but no one logged in → show Login
  if (!currentMember) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <DashboardPage />;
      case 'tasks':      return <TasksPage />;
      case 'log':        return <FamilyLogPage />;
      case 'analytics':  return <AnalyticsPage />;
      case 'members':    return <MembersPage />;
      default:           return <DashboardPage />;
    }
  };

  return (
    <AppLayout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
