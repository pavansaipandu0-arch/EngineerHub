import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  Check,
  Eye,
  EyeOff,
  Layers3,
  LockKeyhole,
  Moon,
  Orbit,
  Sun,
  UsersRound,
} from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Input, Select, Tooltip } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getUserHomePath } from '../utils/authRouting.js';

const branches = [
  'Aerospace',
  'Biomedical',
  'Chemical',
  'Civil',
  'Computer',
  'Electrical',
  'Environmental',
  'Industrial',
  'Materials',
  'Mechanical',
  'Other',
].map((branch) => ({ value: branch.toLowerCase(), label: branch }));
const accountTypes = [
  { value: 'student', label: 'Student' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'employer', label: 'Employer' },
];
const highlights = [
  { icon: Layers3, text: 'One workspace for every engineering discipline' },
  { icon: UsersRound, text: 'Built for students, teams, and professionals' },
  { icon: LockKeyhole, text: 'Private by design, secure from day one' },
];

export default function AuthPage() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const {
    user,
    authError,
    loading: authLoading,
    signIn,
    signUp,
    requestPasswordReset,
    resetPassword,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const resetToken = new URLSearchParams(search).get('token') || '';
  const isRegister = pathname === '/register';
  const isForgotPassword = pathname === '/forgot-password';
  const isResetPassword = pathname === '/reset-password';
  const isPasswordFlow = isForgotPassword || isResetPassword;
  const [form, setForm] = useState({
    name: '',
    email: new URLSearchParams(search).get('email') || '',
    password: '',
    confirmPassword: '',
    branch: '',
    userType: '',
    organization: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span aria-label="Loading account" className="spinner" role="status" />
      </div>
    );
  }
  if (user && !isForgotPassword && !isResetPassword)
    return <Navigate to={getUserHomePath(user)} replace />;

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if ((isRegister || isResetPassword) && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await signUp(form);
        navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
      } else if (isForgotPassword) {
        const result = await requestPasswordReset(form.email);
        setNotice(result.message);
      } else if (isResetPassword) {
        const result = await resetPassword({
          token: resetToken,
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
        setNotice(result.message);
      } else {
        const signedInUser = await signIn({ email: form.email, password: form.password });
        navigate(getUserHomePath(signedInUser), { replace: true });
      }
    } catch (requestError) {
      if (requestError.response?.data?.code === 'VERIFICATION_EMAIL_FAILED') {
        navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}&delivery=failed`);
      } else if (requestError.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
      } else {
        const status = requestError.response?.status;
        const message = requestError.response?.data?.message;
        setError(
          requestError.code === 'API_RESPONSE_INVALID'
            ? requestError.message
            : message ||
                (status === undefined
                  ? 'Could not reach the EngineerHub API. Check the API URL and network connection.'
                  : status === 503
                    ? 'The account service is temporarily unavailable. Check that the API database is connected, then try again.'
                    : 'We could not complete your request. Please try again.'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title = isRegister
    ? 'Create your account'
    : isForgotPassword
      ? 'Reset your password'
      : isResetPassword
        ? 'Choose a new password'
        : 'Welcome back';
  const subtitle = isRegister
    ? 'A few details, then check your email to verify.'
    : isForgotPassword
      ? 'We’ll email a secure link if an account matches.'
      : isResetPassword
        ? 'Choose a new, strong password for your account.'
        : 'Sign in to pick up where you left off.';

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link to="/" className="brand-lockup brand-light">
          <span className="brand-icon">
            <Atom size={21} strokeWidth={2.2} />
          </span>
          <span>
            engineer<span className="brand-accent-light">hub</span>
          </span>
        </Link>
        <div className="story-content">
          <div className="eyebrow eyebrow-light">
            <span className="eyebrow-dot" /> THE ENGINEERING WORKSPACE
          </div>
          <h1>
            Big ideas start
            <br />
            with <span>the right people.</span>
          </h1>
          <p>
            Bring your projects, research, and engineering community together in one thoughtfully
            built space.
          </p>
          <div className="story-highlights">
            {highlights.map(({ icon: Icon, text }) => (
              <div className="story-highlight" key={text}>
                <span>
                  <Icon size={16} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="story-foot">
          <Orbit size={15} /> Made for the curious, the builders, and the bold.
        </div>
        <div className="story-orbit story-orbit-one" />
        <div className="story-orbit story-orbit-two" />
      </section>

      <section className="auth-panel">
        <Tooltip label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
          <Button
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            className="auth-theme-toggle"
            onClick={toggleTheme}
            size="icon"
            variant="secondary"
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </Button>
        </Tooltip>
        <div className="mobile-brand brand-lockup">
          <span className="brand-icon">
            <Atom size={21} />
          </span>
          <span>
            engineer<span className="brand-accent">hub</span>
          </span>
        </div>
        <div className="auth-form-wrap">
          <div className="form-topline">
            <span className="eyebrow">
              {isPasswordFlow ? 'ACCOUNT SECURITY' : 'YOUR NEXT CHAPTER'}
            </span>
            <span className="form-step">
              <Check size={13} /> SECURE BY DESIGN
            </span>
          </div>
          <h2>{title}</h2>
          <p className="form-subtitle">{subtitle}</p>

          <form onSubmit={submit} className="auth-form">
            {isRegister && (
              <>
                <Input
                  autoComplete="name"
                  className="auth-input"
                  label="Full name"
                  maxLength={80}
                  name="name"
                  onChange={update}
                  placeholder="e.g. Alex Morgan"
                  required
                  value={form.name}
                />
                <Input
                  autoComplete="email"
                  className="auth-input"
                  label="Email address"
                  maxLength={254}
                  name="email"
                  onChange={update}
                  placeholder="you@company.com"
                  required
                  type="email"
                  value={form.email}
                />
                <div className="auth-select-grid">
                  <Select
                    label="Engineering branch"
                    name="branch"
                    onChange={update}
                    options={[{ value: '', label: 'Select a branch', disabled: true }, ...branches]}
                    required
                    value={form.branch}
                  />
                  <Select
                    label="I am a..."
                    name="userType"
                    onChange={update}
                    options={[
                      { value: '', label: 'Select your role', disabled: true },
                      ...accountTypes,
                    ]}
                    required
                    value={form.userType}
                  />
                </div>
                <Input
                  autoComplete="organization"
                  className="auth-input"
                  label="College or organization"
                  maxLength={120}
                  name="organization"
                  onChange={update}
                  placeholder="Optional"
                  value={form.organization}
                />
              </>
            )}

            {isForgotPassword && (
              <Input
                autoComplete="email"
                className="auth-input"
                label="Email address"
                maxLength={254}
                name="email"
                onChange={update}
                placeholder="you@company.com"
                required
                type="email"
                value={form.email}
              />
            )}

            {!isForgotPassword && (
              <>
                {!isResetPassword && !isRegister && (
                  <Input
                    autoComplete="email"
                    className="auth-input"
                    label="Email address"
                    maxLength={254}
                    name="email"
                    onChange={update}
                    placeholder="you@company.com"
                    required
                    type="email"
                    value={form.email}
                  />
                )}
                <label className="field">
                  <span>{isResetPassword ? 'New password' : 'Password'}</span>
                  <span className="password-wrap">
                    <input
                      autoComplete={
                        isRegister || isResetPassword ? 'new-password' : 'current-password'
                      }
                      maxLength={128}
                      minLength={isRegister || isResetPassword ? 12 : undefined}
                      name="password"
                      onChange={update}
                      placeholder="At least 12 characters"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                    />
                    <button
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="password-toggle"
                      onClick={() => setShowPassword((value) => !value)}
                      type="button"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                  {(isRegister || isResetPassword) && (
                    <small className="field-hint">
                      Use 12–128 characters, including uppercase, lowercase, a number, and a symbol.
                    </small>
                  )}
                </label>
                {(isRegister || isResetPassword) && (
                  <Input
                    autoComplete="new-password"
                    className="auth-input"
                    label="Confirm password"
                    maxLength={128}
                    minLength={12}
                    name="confirmPassword"
                    onChange={update}
                    placeholder="Enter your password again"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                  />
                )}
              </>
            )}

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {!error && pathname === '/login' && authError && (
              <div className="form-error" role="alert">
                {authError}
              </div>
            )}
            {notice && (
              <div className="auth-success" role="status">
                {notice}
              </div>
            )}
            {isResetPassword && !resetToken && (
              <div className="form-error" role="alert">
                This reset link is invalid. Request a new password reset link.
              </div>
            )}
            <Button
              className="primary-button auth-submit"
              disabled={isResetPassword && !resetToken}
              loading={submitting}
              type="submit"
            >
              {submitting
                ? 'Please wait…'
                : isRegister
                  ? 'Create account'
                  : isForgotPassword
                    ? 'Send reset link'
                    : isResetPassword
                      ? 'Reset password'
                      : 'Sign in'}
              {!submitting && <ArrowRight aria-hidden="true" size={17} />}
            </Button>
          </form>

          <p className="auth-switch">
            {isForgotPassword || isResetPassword ? (
              <Link to="/login">
                <ArrowLeft aria-hidden="true" size={13} /> Back to sign in
              </Link>
            ) : isRegister ? (
              <>
                Already part of EngineerHub? <Link to="/login">Sign in</Link>
              </>
            ) : (
              <>
                New to EngineerHub? <Link to="/register">Create an account</Link>
              </>
            )}
          </p>
          {!isRegister && !isPasswordFlow && (
            <p className="auth-forgot">
              <Link to="/forgot-password">Forgot your password?</Link>
            </p>
          )}
          <div className="form-security">
            <LockKeyhole size={13} /> Your information is encrypted and secure
          </div>
        </div>
        <div className="auth-bottom">
          <span>ENGINEERHUB</span>
          <span>BUILT FOR WHAT'S NEXT</span>
        </div>
      </section>
    </main>
  );
}
