import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { DashboardLayout } from './components/DashboardLayout';
import { Loader2 } from 'lucide-react';
import { MatrixProvider } from './context/MatrixContext';
import { LanguageProvider } from './context/LanguageContext';
import { supabase } from './services/supabaseClient';
import type { AppUser } from './types';

// Lazy load pages to reduce bundle size and improve initial load time
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Signup = lazy(() => import('./pages/Signup').then(module => ({ default: module.Signup })));
const CheckerDashboard = lazy(() => import('./pages/CheckerDashboard').then(module => ({ default: module.CheckerDashboard })));
const CheckerInclude = lazy(() => import('./pages/CheckerInclude').then(module => ({ default: module.CheckerInclude })));
const CheckerMonitoringRoom = lazy(() => import('./pages/CheckerMonitoringRoom').then(module => ({ default: module.CheckerMonitoringRoom })));
const CheckerChecks = lazy(() => import('./pages/CheckerChecks').then(module => ({ default: module.CheckerChecks })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const ApiKeys = lazy(() => import('./pages/ApiKeys').then(module => ({ default: module.ApiKeys })));
const Subaccounts = lazy(() => import('./pages/Subaccounts').then(module => ({ default: module.Subaccounts })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <Loader2 className="w-8 h-8 animate-spin text-[#141585]" />
  </div>
);

type UserData = AppUser['user_data'];

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const lastProfileUserIdRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserData | null> => {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', userId)
        .maybeSingle<UserData>();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data ?? null;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async (
      nextSession: Session | null,
      reason: AuthChangeEvent | 'INITIAL_LOAD'
    ) => {
      if (!isMounted) return;

      setSession(nextSession);

      if (!nextSession?.user) {
        lastProfileUserIdRef.current = null;
        setUserData(null);
        setLoading(false);
        return;
      }

      const nextUserId = nextSession.user.id;
      const shouldRefreshProfile =
        reason === 'INITIAL_LOAD' ||
        reason === 'SIGNED_IN' ||
        reason === 'USER_UPDATED' ||
        lastProfileUserIdRef.current !== nextUserId;

      if (shouldRefreshProfile) {
        const profile = await fetchUserProfile(nextUserId);
        if (!isMounted) return;
        setUserData(profile);
        lastProfileUserIdRef.current = nextUserId;
      }

      setLoading(false);
    };

    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      await syncSession(data.session, 'INITIAL_LOAD');
    };
    void initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }

      void syncSession(nextSession, event);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserData(null);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const appUser = useMemo<AppUser | null>(() => {
    if (!session?.user) {
      return null;
    }

    const fullName = session.user.user_metadata?.full_name;
    const fullNameParts =
      typeof fullName === 'string' ? fullName.trim().split(/\s+/).filter(Boolean) : [];

    return {
      id: session.user.id,
      email: session.user.email ?? null,
      user_data: userData ?? {
        first_name: fullNameParts[0] ?? '',
        name: fullNameParts.slice(1).join(' '),
        company_name: 'Company'
      }
    };
  }, [session, userData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#141585]" />
      </div>
    );
  }

  return (
    <LanguageProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route 
              path="/login" 
              element={!session ? <Login /> : <Navigate to="/checker/dashboard" replace />} 
            />
            <Route 
              path="/signup" 
              element={!session ? <Signup /> : <Navigate to="/checker/dashboard" replace />} 
            />

            {session ? (
              <Route element={
                <MatrixProvider>
                  <DashboardLayout onLogout={handleLogout} user={appUser} />
                </MatrixProvider>
              }>
                <Route path="/" element={<Navigate to="/checker/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/checker/dashboard" element={<CheckerDashboard />} />
                <Route path="/checker/include" element={<CheckerInclude />} />
                <Route path="/checker/monitoring_room" element={<CheckerMonitoringRoom />} />
                <Route path="/checker/checks/:vatNumberUuid" element={<CheckerChecks />} />
                <Route path="/checker/subaccounts" element={<Subaccounts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/api-keys" element={<ApiKeys />} />
                <Route path="/settings/subaccounts" element={<Navigate to="/checker/subaccounts" replace />} />
                <Route path="*" element={<Navigate to="/checker/dashboard" replace />} />
              </Route>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
