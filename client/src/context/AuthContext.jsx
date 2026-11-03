import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      if (error.response?.status !== 401) throw error;
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser().catch(() => setLoading(false));
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      async signIn(credentials) {
        const { data } = await api.post('/auth/login', credentials);
        setUser(data.user);
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
    [user, loading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
