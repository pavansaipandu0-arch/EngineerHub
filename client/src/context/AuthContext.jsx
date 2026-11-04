import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import api, { SESSION_EXPIRED_EVENT } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const restoreRequest = useRef(null);

  const refreshUser = useCallback(async () => {
    if (restoreRequest.current) return restoreRequest.current;
    const request = (async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setAuthError('');
        return data.user;
      } catch (error) {
        setUser(null);
        if (error.response?.status !== 401) {
          setAuthError(
            error.response?.data?.message || 'Unable to restore your session. Please try again.',
          );
          throw error;
        }
        setAuthError('');
        return null;
      } finally {
        setLoading(false);
      }
    })();
    restoreRequest.current = request;
    try {
      return await request;
    } finally {
      if (restoreRequest.current === request) restoreRequest.current = null;
    }
  }, []);

  useEffect(() => {
    const clearExpiredSession = () => {
      setUser(null);
      setAuthError('');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, clearExpiredSession);
    refreshUser().catch(() => setLoading(false));
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, clearExpiredSession);
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      async signIn(credentials) {
        const { data } = await api.post('/auth/login', credentials);
        setUser(data.user);
        setAuthError('');
        return data.user;
      },
      async signUp(details) {
        const { data } = await api.post('/auth/register', details);
        return data;
      },
      async verifyEmail(token) {
        const { data } = await api.post('/auth/email/verify', { token });
        setUser(data.user);
        return data;
      },
      async resendVerification(email) {
        const { data } = await api.post('/auth/email/verification/resend', { email });
        return data;
      },
      async requestPasswordReset(email) {
        const { data } = await api.post('/auth/password/forgot', { email });
        return data;
      },
      async resetPassword(details) {
        const { data } = await api.post('/auth/password/reset', details);
        return data;
      },
      async signOut() {
        await api.post('/auth/logout');
        setUser(null);
      },
      async signOutEverywhere() {
        await api.delete('/auth/sessions');
        setUser(null);
      },
      refreshUser,
    }),
    [user, loading, authError, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
