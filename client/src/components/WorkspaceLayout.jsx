import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Atom,
  Bell,
  Bot,
  Briefcase,
  BookOpen,
  Blocks,
  CalendarDays,
  Calculator,
  FlaskConical,
  GraduationCap,
  Gauge,
  LogOut,
  MessageCircle,
  Menu,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  UsersRound,
  CircleHelp,
  UserRound,
  X,
} from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Button, EmptyState, ErrorState, LoadingSkeleton, useToast } from './ui.jsx';

const moduleLinks = [
  { key: 'engineer-profiles', label: 'My profile', to: '/profile', icon: UserRound },
  { key: 'engineer-profiles', label: 'Discover engineers', to: '/engineers', icon: UsersRound },
  { key: 'notifications', label: 'Notifications', to: '/notifications', icon: Bell },
  { key: 'community-hub', label: 'Community', to: '/community', icon: UsersRound },
  { key: 'question-board', label: 'Questions', to: '/questions', icon: CircleHelp },
  { key: 'project-studio', label: 'Projects', to: '/projects', icon: Blocks },
  { key: 'engineering-library', label: 'Knowledge library', to: '/library', icon: BookOpen },
  { key: 'engineering-tools', label: 'Engineering tools', to: '/tools', icon: Calculator },
  { key: 'jobs-internships', label: 'Jobs & internships', to: '/jobs', icon: Briefcase },
  { key: 'learning-center', label: 'Learning center', to: '/learning', icon: GraduationCap },
  { key: 'events-hackathons', label: 'Events & hackathons', to: '/events', icon: CalendarDays },
  { key: 'research-hub', label: 'Research hub', to: '/research', icon: FlaskConical },
  { key: 'messaging', label: 'Messages', to: '/messages', icon: MessageCircle },
  { key: 'ai-assistant', label: 'AI assistant', to: '/assistant', icon: Bot },
  { key: 'quiz-system', label: 'Quizzes', to: '/quizzes', icon: CircleHelp },
  { key: 'project-showcase', label: 'Project showcase', to: '/showcase', icon: Blocks },
];

export function FeatureGate({ feature, children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, message: '' });
  useEffect(() => {
    let active = true;
    api
      .get('/features')
      .then(({ data }) => {
        const configured = data.features.find((item) => item.key === feature);
        if (!configured) {
          if (active) setState({ loading: false, error: 'This module is not configured.' });
        } else if (!configured.implemented || !configured.enabled || configured.maintenance) {
          if (active) setState({ loading: false, message: configured.availabilityMessage });
        } else if (!configured.accessAllowed) {
          if (active) {
            setState({
              loading: false,
              message: 'Your account role does not have access to this module.',
            });
          }
        } else if (active) setState({ loading: false, message: '' });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            error: error.response?.data?.message || 'Module availability could not be checked.',
          });
      });
    return () => {
      active = false;
    };
  }, [feature, user.role, user.userType]);
  if (state.loading) return <LoadingSkeleton className="skeleton-card" lines={3} />;
  if (state.error) return <ErrorState description={state.error} />;
  if (state.message) return <EmptyState title="Module unavailable" description={state.message} />;
  return children;
}

export default function WorkspaceLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const notify = useToast();
  const [features, setFeatures] = useState([]);
  const [featureError, setFeatureError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get('/features')
      .then(({ data }) => {
        if (active) setFeatures(data.features);
      })
      .catch((error) => {
        if (active)
          setFeatureError(error.response?.data?.message || 'Module navigation is unavailable.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      notify(error.response?.data?.message || 'Could not sign out. Please try again.', 'error');
    } finally {
      setSigningOut(false);
    }
  }

  const visibleKeys = new Set(
    features
      .filter(
        (feature) =>
          feature.accessAllowed &&
          ((feature.implemented && feature.enabled && !feature.maintenance) ||
            feature.showWhenDisabled),
      )
      .map((feature) => feature.key),
  );
  const navigation = [
    { label: 'Overview', to: '/workspace', icon: Gauge },
    ...moduleLinks.filter((item) => visibleKeys.has(item.key)),
    { label: 'Active sessions', to: '/sessions', icon: ShieldCheck },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} id="workspace-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">
            <Atom size={21} />
          </span>
          <span className="brand-word">
            engineer<span>hub</span>
          </span>
          <button
            aria-label="Close navigation"
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">E</div>
          <div>
            <strong>EngineerHub</strong>
            <small>Engineering workspace</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Workspace navigation" className="side-nav">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
              end={to === '/workspace'}
              key={to}
              onClick={() => setMenuOpen(false)}
              to={to}
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
          {user.role === 'admin' && (
            <NavLink
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
              to="/admin"
            >
              <Settings2 size={17} /> Feature controls
            </NavLink>
          )}
        </nav>
        {featureError && (
          <p className="sidebar-error" role="status">
            {featureError}
          </p>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Administrator' : user.userType}</small>
            </div>
            <Button
              aria-label="Sign out"
              disabled={signingOut}
              loading={signingOut}
              onClick={handleSignOut}
              size="icon"
              variant="ghost"
            >
              <LogOut size={17} />
            </Button>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          aria-label="Close menu"
          className="mobile-backdrop"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}
      <main className="main-content workspace-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              aria-controls="workspace-sidebar"
              aria-expanded={menuOpen}
              aria-label="Open navigation"
              className="mobile-menu"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              <NavLink to="/workspace">Workspace</NavLink>
              <span>/</span>
              <strong>EngineerHub</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <Button
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              onClick={toggleTheme}
              size="icon"
              variant="secondary"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </Button>
            <span className="topbar-avatar" aria-label={user.name}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <div className="page-content workspace-route-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
