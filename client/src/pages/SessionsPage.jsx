import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Monitor, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Table,
  useToast,
} from '../components/ui.jsx';

function describeDevice(userAgent) {
  if (!userAgent) return 'Browser session';
  const browser = /Edg\//.test(userAgent)
    ? 'Microsoft Edge'
    : /Chrome\//.test(userAgent)
      ? 'Google Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Mozilla Firefox'
        : /Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)
          ? 'Safari'
          : 'Browser session';
  const platform = /Windows/.test(userAgent)
    ? 'Windows'
    : /Mac OS/.test(userAgent)
      ? 'macOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad/.test(userAgent)
          ? 'iOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  return platform ? `${browser} on ${platform}` : browser;
}

export default function SessionsPage() {
  const { signOutEverywhere } = useAuth();
  const notify = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/sessions');
      setSessions(data.sessions);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your active sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function revokeSession(session) {
    setBusyId(session.id);
    try {
      await api.delete(`/auth/sessions/${session.id}`);
      setSessions((current) => current.filter((item) => item.id !== session.id));
      notify('Session signed out.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to revoke this session.', 'error');
    } finally {
      setBusyId('');
    }
  }

  async function revokeAll() {
    setBusyId('all');
    try {
      await signOutEverywhere();
    } catch (requestError) {
      setBusyId('');
      setConfirmAll(false);
      notify(requestError.response?.data?.message || 'Unable to sign out all sessions.', 'error');
    }
  }

  return (
    <main className="sessions-page">
      <header className="sessions-header">
        <Link aria-label="EngineerHub home" className="brand-lockup" to="/">
          <span className="brand-icon">
            <ShieldCheck size={19} />
          </span>
          <span>
            engineer<span className="brand-accent">hub</span>
          </span>
        </Link>
        <Link className="sessions-back" to="/workspace">
          <ArrowLeft size={15} /> Back to workspace
        </Link>
      </header>
      <div className="sessions-content">
        <span className="landing-section-kicker">ACCOUNT SECURITY</span>
        <h1>Active sessions</h1>
        <p className="sessions-intro">
          Review signed-in browsers and end sessions you no longer recognize or use.
        </p>
        {error ? (
          <ErrorState
            action={
              <Button onClick={loadSessions} variant="secondary">
                Try again
              </Button>
            }
            description={error}
          />
        ) : loading ? (
          <Card className="sessions-loading">
            <span aria-label="Loading sessions" className="spinner" role="status" />
          </Card>
        ) : sessions.length ? (
          <>
            <Table caption="Your active EngineerHub sessions" className="sessions-table">
              <thead>
                <tr>
                  <th scope="col">DEVICE</th>
                  <th scope="col">SIGNED IN</th>
                  <th scope="col">EXPIRES</th>
                  <th scope="col">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div className="sessions-device">
                        <Monitor aria-hidden="true" size={17} />
                        <div>
                          <strong>{describeDevice(session.userAgent)}</strong>
                          {session.current && <Badge tone="brand">This device</Badge>}
                        </div>
                      </div>
                    </td>
                    <td>{new Date(session.createdAt).toLocaleString()}</td>
                    <td>{new Date(session.expiresAt).toLocaleDateString()}</td>
                    <td>
                      {session.current ? (
                        <Badge dot tone="success">
                          Current
                        </Badge>
                      ) : (
                        <Button
                          disabled={busyId === session.id}
                          loading={busyId === session.id}
                          onClick={() => revokeSession(session)}
                          size="sm"
                          variant="secondary"
                        >
                          Sign out
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="sessions-actions">
              <p>Signing out all sessions ends access on this device too.</p>
              <Button
                disabled={busyId === 'all'}
                onClick={() => setConfirmAll(true)}
                variant="danger"
              >
                Sign out all sessions
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            description="Sign in again to create a new secure session."
            icon={Monitor}
            title="No active sessions"
          />
        )}
      </div>
      <ConfirmDialog
        busy={busyId === 'all'}
        confirmLabel="Sign out everywhere"
        description="This ends every active session, including this browser. You’ll need to sign in again."
        onClose={() => setConfirmAll(false)}
        onConfirm={revokeAll}
        open={confirmAll}
        title="Sign out on every device?"
      />
    </main>
  );
}
