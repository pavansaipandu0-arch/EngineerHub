import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Atom, CheckCircle2, MailCheck, Moon, Sun } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Tooltip } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getUserHomePath } from '../utils/authRouting.js';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const deliveryFailed = searchParams.get('delivery') === 'failed';
  const { user, loading: authLoading, verifyEmail, resendVerification } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [status, setStatus] = useState(token ? 'verifying' : 'waiting');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(
    deliveryFailed
      ? 'Your account was created, but email delivery failed. Configure SMTP and resend the verification link.'
      : '',
  );
  const [busy, setBusy] = useState(false);
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (!token || user || authLoading || verificationStarted.current) return undefined;
    verificationStarted.current = true;
    let active = true;
    verifyEmail(token)
      .then((result) => {
        if (!active) return;
        setStatus('verified');
        setMessage(result.message);
      })
      .catch((requestError) => {
        if (!active) return;
        setStatus('invalid');
        setError(requestError.response?.data?.message || 'This link is invalid or has expired.');
      });
    return () => {
      active = false;
    };
  }, [authLoading, token, user, verifyEmail]);

  if (user && status === 'verified')
    return <Navigate to={getUserHomePath(user)} replace />;
  if (authLoading)
    return (
      <div className="grid min-h-screen place-items-center">
        <span aria-label="Loading account" className="spinner" role="status" />
      </div>
    );

  async function resend(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await resendVerification(email);
      setMessage(result.message);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || 'Unable to send a verification link. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="verification-page">
      <header className="verification-header">
        <Link aria-label="EngineerHub home" className="brand-lockup" to="/">
          <span className="brand-icon">
            <Atom size={20} />
          </span>
          <span>
            engineer<span className="brand-accent">hub</span>
          </span>
        </Link>
        <Tooltip label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
          <Button
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            onClick={toggleTheme}
            size="icon"
            variant="secondary"
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </Button>
        </Tooltip>
      </header>
      <section className="verification-card">
        <span className="verification-icon">
          {status === 'verified' ? <CheckCircle2 size={26} /> : <MailCheck size={26} />}
        </span>
        <span className="landing-section-kicker">ACCOUNT VERIFICATION</span>
        <h1>
          {status === 'verified'
            ? 'Your email is verified.'
            : status === 'verifying'
              ? 'Verifying your email…'
              : 'Check your inbox.'}
        </h1>
        <p>
          {status === 'verified'
            ? message
            : status === 'verifying'
              ? 'We’re confirming your secure verification link.'
              : 'Follow the link in your email to activate your EngineerHub account.'}
        </p>
        {status === 'waiting' && (
          <form className="verification-form" onSubmit={resend}>
            <Input
              autoComplete="email"
              label="Email address"
              maxLength={254}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="auth-success" role="status">
                {message}
              </div>
            )}
            <Button loading={busy} type="submit" variant="secondary">
              Resend verification email
            </Button>
          </form>
        )}
        {status === 'invalid' && (
          <>
            <div className="form-error" role="alert">
              {error}
            </div>
            <form className="verification-form" onSubmit={resend}>
              <Input
                autoComplete="email"
                label="Email address"
                maxLength={254}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
              {message && (
                <div className="auth-success" role="status">
                  {message}
                </div>
              )}
              <Button loading={busy} type="submit" variant="secondary">
                Send a fresh verification link
              </Button>
            </form>
          </>
        )}
        <Link className="verification-link" to="/login">
          Return to sign in <ArrowRight size={14} />
        </Link>
      </section>
      <footer className="verification-footer">EngineerHub · Secure engineering workspace</footer>
    </main>
  );
}
