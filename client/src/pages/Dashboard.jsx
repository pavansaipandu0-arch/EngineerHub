import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Atom,
  Blocks,
  BookOpen,
  Check,
  Calculator,
  CircleHelp,
  Command,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  LogOut,
  Menu,
  Moon,
  Power,
  Settings2,
  ShieldCheck,
  Sun,
  UsersRound,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dropdown,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  Pagination,
  SearchBar,
  Table,
  Tabs,
  Tooltip,
  useToast,
} from '../components/ui.jsx';
import api from '../api.js';

const icons = {
  'project-studio': Blocks,
  'engineering-library': BookOpen,
  'engineering-tools': Calculator,
  'community-hub': UsersRound,
  'research-lab': FlaskConical,
  'team-workspace': Cpu,
};
const descriptions = {
  'project-studio': 'Organize technical projects and collaborate on the work that matters.',
  'engineering-library': 'A shared home for engineering knowledge and learning resources.',
  'community-hub': 'Connect with engineers, students, and collaborators across disciplines.',
  'research-lab': 'Bring research notes, experiments, and ideas together.',
  'team-workspace': 'Coordinate engineering teams with a focused shared workspace.',
};
const featureRoutes = {
  'project-studio': '/projects',
  'engineering-library': '/library',
  'community-hub': '/community',
  'question-board': '/questions',
  'engineering-tools': '/tools',
};

function FeatureCard({ feature }) {
  const Icon = icons[feature.key] || Blocks;
  return (
    <Card as="article" className={`feature-card ${feature.enabled ? '' : 'feature-disabled'}`}>
      <div className="feature-card-top">
        <span className={`feature-icon ${feature.enabled ? '' : 'feature-icon-disabled'}`}>
          <Icon size={19} />
        </span>
        <Badge dot tone={feature.enabled ? 'success' : 'neutral'}>
          {feature.enabled ? 'Available' : 'Paused'}
        </Badge>
      </div>
      <h3>{feature.name}</h3>
      <p>
        {feature.description || descriptions[feature.key] || 'An EngineerHub workspace module.'}
      </p>
      {!feature.enabled && <div className="availability-note">{feature.availabilityMessage}</div>}
      {feature.enabled && featureRoutes[feature.key] && (
        <Link className="feature-open-link" to={featureRoutes[feature.key]}>
          Open workspace
        </Link>
      )}
    </Card>
  );
}

function AccountStatusPanel() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageCount: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const notify = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { page, limit: 10, search } });
      setUsers(data.users);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load account status.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function changeStatus(account) {
    const status = account.status === 'suspended' ? 'active' : 'suspended';
    setBusyId(account._id);
    try {
      const { data } = await api.patch(`/admin/users/${account._id}/status`, { status });
      setUsers((current) =>
        current.map((item) => (item._id === account._id ? { ...item, ...data.user } : item)),
      );
      notify(`${account.name}'s account is ${status}.`);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update account status.', 'error');
    } finally {
      setBusyId('');
    }
  }

  return (
    <section className="admin-section">
      <div className="section-heading admin-heading">
        <div>
          <div className="eyebrow">ACCOUNT SECURITY</div>
          <h2>Member account status</h2>
          <p>
            Review accounts and suspend or restore access. Admin privileges are not editable here.
          </p>
        </div>
        <Badge className="admin-badge" tone="brand">
          <ShieldCheck size={15} /> Admin access
        </Badge>
        <Link className="ui-button ui-button-secondary ui-button-sm" to="/admin/moderation">
          Review content
        </Link>
      </div>
      <SearchBar
        className="admin-user-search"
        label="Search member accounts"
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="Search name or email..."
        value={search}
      />
      {error ? (
        <ErrorState
          action={
            <Button onClick={loadUsers} variant="secondary">
              Try again
            </Button>
          }
          description={error}
        />
      ) : loading ? (
        <div className="admin-user-loading">
          <LoadingSkeleton lines={3} />
        </div>
      ) : users.length ? (
        <>
          <Table caption="Member accounts and their current status" className="admin-table">
            <thead>
              <tr>
                <th scope="col">ACCOUNT</th>
                <th scope="col">PROFILE</th>
                <th scope="col">EMAIL</th>
                <th scope="col">STATUS</th>
                <th scope="col">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account._id}>
                  <td>
                    <div className="table-module">
                      <strong>{account.name}</strong>
                      <span>{account.email}</span>
                    </div>
                  </td>
                  <td>
                    {account.userType} · {account.branch}
                  </td>
                  <td>
                    <Badge dot tone={account.emailVerified ? 'success' : 'neutral'}>
                      {account.emailVerified ? 'Verified' : 'Not verified'}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      dot
                      tone={
                        account.status === 'active'
                          ? 'success'
                          : account.status === 'suspended'
                            ? 'error'
                            : 'neutral'
                      }
                    >
                      {account.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      disabled={
                        busyId === account._id ||
                        (account.status === 'pending_verification' && !account.emailVerified)
                      }
                      loading={busyId === account._id}
                      onClick={() => changeStatus(account)}
                      size="sm"
                      variant={account.status === 'suspended' ? 'secondary' : 'danger'}
                    >
                      {account.status === 'suspended' ? 'Restore' : 'Suspend'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            onPageChange={setPage}
            page={pagination.page}
            pageCount={pagination.pageCount}
          />
        </>
      ) : (
        <EmptyState
          description={
            search ? 'Try another name or email.' : 'Accounts appear here after users register.'
          }
          icon={UsersRound}
          title="No accounts found"
        />
      )}
    </section>
  );
}

function AdminPanel({ features, onUpdated }) {
  const [busy, setBusy] = useState('');
  const [pendingChange, setPendingChange] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageCount, setHistoryPageCount] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const notify = useToast();

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/admin/features/history', {
        params: { page: historyPage, limit: 10 },
      });
      setHistory(data.history);
      setHistoryPageCount(data.pagination.pageCount);
      setHistoryError('');
    } catch (error) {
      setHistoryError(error.response?.data?.message || 'Could not load feature history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function changeMessage(feature, value) {
    const message = value.trim();
    if (!message || message === feature.availabilityMessage) return;
    try {
      await api.patch(`/admin/features/${feature.key}`, { availabilityMessage: message });
      await onUpdated();
      notify('Availability message saved.');
    } catch (error) {
      notify(error.response?.data?.message || 'Could not save this message.', 'error');
    }
  }

  function requestToggle(feature, field, value) {
    const labels = {
      enabled: value ? 'Enable module' : 'Disable module',
      maintenance: value ? 'Enable maintenance mode' : 'Disable maintenance mode',
      showWhenDisabled: value
        ? 'Show disabled module in navigation'
        : 'Hide disabled module from navigation',
      emergency: 'Emergency disable',
    };
    setPendingChange({
      feature,
      field,
      value,
      title: labels[field],
    });
  }

  async function confirmChange() {
    if (!pendingChange) return;
    const { feature, field, value } = pendingChange;
    setBusy(feature.key);
    try {
      if (field === 'emergency') {
        await api.post(`/admin/features/${feature.key}/emergency-disable`);
        notify(`${feature.name} was emergency-disabled.`);
      } else {
        await api.patch(`/admin/features/${feature.key}`, { [field]: value });
        notify(`${feature.name} settings updated.`);
      }
      setPendingChange(null);
      await Promise.all([onUpdated(), loadHistory()]);
    } catch (error) {
      notify(error.response?.data?.message || 'Could not update this module.', 'error');
    } finally {
      setBusy('');
    }
  }

  async function changeRoles(feature, value) {
    try {
      await api.patch(`/admin/features/${feature.key}`, {
        allowedRoles: value
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean),
      });
      await onUpdated();
      notify('Module access roles saved.');
    } catch (error) {
      notify(error.response?.data?.message || 'Could not update module access roles.', 'error');
    }
  }

  async function changePermissions(feature, value) {
    try {
      await api.patch(`/admin/features/${feature.key}`, {
        requiredPermissions: value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
      await onUpdated();
      notify('Module permissions saved.');
    } catch (error) {
      notify(error.response?.data?.message || 'Could not update module permissions.', 'error');
    }
  }

  return (
    <section className="admin-section" id="admin">
      <div className="section-heading admin-heading">
        <div>
          <div className="eyebrow">ADMINISTRATION</div>
          <h2>Feature control center</h2>
          <p>
            Configure module access, availability, maintenance, and visibility. Changes are applied
            immediately and audited.
          </p>
        </div>
        <Badge className="admin-badge" tone="brand">
          <ShieldCheck size={15} /> Admin access
        </Badge>
      </div>
      <Table
        caption="EngineerHub module availability and administrator controls"
        className="admin-table"
      >
        <thead>
          <tr>
            <th scope="col">MODULE</th>
            <th scope="col">STATUS</th>
            <th scope="col">NAVIGATION</th>
            <th scope="col">MAINTENANCE</th>
            <th scope="col">ROLES / PERMISSIONS</th>
            <th scope="col">USER MESSAGE</th>
            <th scope="col">LAST UPDATED</th>
            <th scope="col">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.key}>
              <td>
                <div className="table-module">
                  <span className="table-icon">
                    {(() => {
                      const Icon = icons[feature.key] || Blocks;
                      return <Icon size={17} />;
                    })()}
                  </span>
                  <strong>{feature.name}</strong>
                  <small>
                    {feature.category} ·{' '}
                    {feature.implemented
                      ? 'Implementation available'
                      : 'Implementation not available'}
                  </small>
                </div>
              </td>
              <td>
                <Badge
                  dot
                  tone={
                    feature.enabled && feature.implemented && !feature.maintenance
                      ? 'success'
                      : 'neutral'
                  }
                >
                  {!feature.implemented
                    ? 'Unavailable'
                    : feature.maintenance
                      ? 'Maintenance'
                      : feature.enabled
                        ? 'Enabled'
                        : 'Disabled'}
                </Badge>
                <button
                  aria-label={`${feature.enabled ? 'Disable' : 'Enable'} ${feature.name}`}
                  aria-pressed={feature.enabled}
                  className={`toggle ${feature.enabled ? 'toggle-on' : ''}`}
                  disabled={busy === feature.key || (!feature.implemented && !feature.enabled)}
                  onClick={() => requestToggle(feature, 'enabled', !feature.enabled)}
                  type="button"
                >
                  <span />
                </button>
              </td>
              <td>
                <button
                  aria-label={`${feature.showWhenDisabled ? 'Hide' : 'Show'} ${feature.name} when disabled`}
                  aria-pressed={feature.showWhenDisabled}
                  className={`toggle ${feature.showWhenDisabled ? 'toggle-on' : ''}`}
                  disabled={busy === feature.key}
                  onClick={() =>
                    requestToggle(feature, 'showWhenDisabled', !feature.showWhenDisabled)
                  }
                  type="button"
                >
                  <span />
                </button>
                <small>
                  {feature.showWhenDisabled
                    ? 'Visible when unavailable'
                    : 'Hidden when unavailable'}
                </small>
              </td>
              <td>
                <button
                  aria-label={`${feature.maintenance ? 'Disable' : 'Enable'} maintenance mode for ${feature.name}`}
                  aria-pressed={feature.maintenance}
                  className={`toggle ${feature.maintenance ? 'toggle-on' : ''}`}
                  disabled={busy === feature.key || !feature.implemented}
                  onClick={() => requestToggle(feature, 'maintenance', !feature.maintenance)}
                  type="button"
                >
                  <span />
                </button>
                <small>{feature.maintenance ? 'On' : 'Off'}</small>
              </td>
              <td className="feature-access-controls">
                <label>
                  <span className="sr-only">{feature.name} permitted roles</span>
                  <Input
                    className="message-input"
                    defaultValue={feature.allowedRoles.join(',')}
                    key={`${feature.key}-roles-${feature.allowedRoles.join(',')}`}
                    onBlur={(event) => {
                      if (event.target.value !== feature.allowedRoles.join(','))
                        changeRoles(feature, event.target.value);
                    }}
                    placeholder="member,student"
                    hint="Allowed values: member, admin, student, engineer, employer."
                  />
                </label>
                <label>
                  <span className="sr-only">{feature.name} required permissions</span>
                  <Input
                    className="message-input"
                    defaultValue={feature.requiredPermissions.join(',')}
                    key={`${feature.key}-permissions-${feature.requiredPermissions.join(',')}`}
                    onBlur={(event) => {
                      if (event.target.value !== feature.requiredPermissions.join(','))
                        changePermissions(feature, event.target.value);
                    }}
                    placeholder="permissions:required"
                    hint="Comma-separated permission identifiers checked by the API."
                  />
                </label>
              </td>
              <td>
                <Input
                  aria-label={`${feature.name} availability message`}
                  className="message-input"
                  defaultValue={feature.availabilityMessage}
                  key={`${feature.key}-${feature.availabilityMessage}`}
                  maxLength={180}
                  onBlur={(event) => {
                    if (event.target.value !== feature.availabilityMessage)
                      changeMessage(feature, event.target.value);
                  }}
                />
              </td>
              <td>
                <small>
                  {feature.updatedBy?.name || 'System'}
                  <br />
                  {new Date(feature.updatedAt).toLocaleString()}
                </small>
              </td>
              <td>
                <Button
                  aria-label={`Emergency disable ${feature.name}`}
                  disabled={
                    busy === feature.key ||
                    (!feature.enabled && !feature.showWhenDisabled && !feature.maintenance)
                  }
                  onClick={() => requestToggle(feature, 'emergency')}
                  size="sm"
                  variant="danger"
                >
                  <Power size={14} /> Disable now
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="admin-footnote">
        <ShieldCheck size={14} /> Server routes enforce enabled status, maintenance mode, role
        access, and required permissions. Unimplemented modules cannot be enabled.
      </p>
      <section className="feature-history">
        <div className="section-heading">
          <div>
            <div className="eyebrow">AUDIT LOG</div>
            <h3>Feature status history</h3>
          </div>
        </div>
        {historyError ? (
          <ErrorState
            description={historyError}
            action={
              <Button onClick={loadHistory} variant="secondary">
                Try again
              </Button>
            }
          />
        ) : historyLoading ? (
          <LoadingSkeleton lines={3} />
        ) : history.length ? (
          <>
            <Table caption="Feature configuration audit history" className="admin-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>MODULE</th>
                  <th>ADMINISTRATOR</th>
                  <th>ACTION</th>
                  <th>CHANGES</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry._id}>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>
                      {features.find((feature) => feature.key === entry.featureKey)?.name ||
                        entry.featureKey}
                    </td>
                    <td>{entry.actor?.name || 'Administrator'}</td>
                    <td>{entry.action.replace('_', ' ')}</td>
                    <td>
                      {entry.changes
                        .map(
                          (change) =>
                            `${change.field}: ${JSON.stringify(change.previous)} → ${JSON.stringify(change.current)}`,
                        )
                        .join('; ') || 'Emergency action recorded'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              onPageChange={setHistoryPage}
              page={historyPage}
              pageCount={historyPageCount}
            />
          </>
        ) : (
          <EmptyState
            title="No feature changes yet"
            description="Administrator changes to feature settings will appear here."
          />
        )}
      </section>
      <ConfirmDialog
        busy={Boolean(busy)}
        confirmLabel={pendingChange?.title || 'Confirm'}
        description={
          pendingChange?.field === 'emergency'
            ? `Immediately disable ${pendingChange.feature.name}, hide it from navigation, and block its APIs. Existing data will not be deleted.`
            : `${pendingChange?.title} for ${pendingChange?.feature.name}? This takes effect immediately and is recorded in the audit history.`
        }
        onClose={() => {
          if (!busy) setPendingChange(null);
        }}
        onConfirm={confirmChange}
        open={Boolean(pendingChange)}
        title={pendingChange?.title || 'Confirm module setting'}
      />
      <AccountStatusPanel />
    </section>
  );
}

function DashboardInsights({ data, loading, error, onRetry }) {
  if (loading) {
    return (
      <section className="workspace-insights" aria-label="Personalized workspace data">
        <LoadingSkeleton lines={4} />
      </section>
    );
  }
  if (error || !data) {
    return (
      <section className="workspace-insights">
        <ErrorState
          description={error || 'Dashboard data is unavailable.'}
          action={
            <Button onClick={onRetry} variant="secondary">
              Try again
            </Button>
          }
        />
      </section>
    );
  }
  const modules = data.modules || {};
  const quickActions = [
    modules['project-studio'] && { label: 'Create a project', to: '/projects', icon: Blocks },
    modules['question-board'] && { label: 'Ask a question', to: '/questions', icon: CircleHelp },
    modules['community-hub'] && { label: 'Write a post', to: '/community', icon: UsersRound },
    modules['engineering-library'] && { label: 'Browse resources', to: '/library', icon: BookOpen },
    modules['engineering-tools'] && {
      label: 'Open engineering tools',
      to: '/tools',
      icon: Calculator,
    },
    { label: 'Edit your profile', to: '/profile', icon: Activity },
  ].filter(Boolean);

  return (
    <section className="workspace-insights" aria-label="Your engineering dashboard">
      <div className="section-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h2>Personalized overview</h2>
          <p>
            {data.user?.branch} engineering · {data.user?.organization || data.user?.userType}
          </p>
        </div>
        <Link className="text-link" to="/profile">
          Complete your profile
        </Link>
      </div>
      <div className="quick-actions">
        {quickActions.map(({ label, to, icon: Icon }) => (
          <Link className="quick-action" key={to} to={to}>
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <div className="dashboard-stat-grid">
        <DashboardStat label="Your posts" value={data.summary.posts} to="/community" />
        <DashboardStat label="Questions asked" value={data.summary.questions} to="/questions" />
        <DashboardStat label="Owned projects" value={data.summary.ownedProjects} to="/projects" />
        <DashboardStat
          label="Open assigned tasks"
          value={data.summary.openTasksAssigned}
          to="/projects"
        />
      </div>
      <div className="dashboard-content-grid">
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>My projects</h3>
            <Link to="/projects">View projects</Link>
          </div>
          {data.projects.length ? (
            <div className="dashboard-records">
              {data.projects.map((project) => (
                <Link
                  className="dashboard-record"
                  key={project._id}
                  to={`/projects/${project._id}`}
                >
                  <strong>{project.name}</strong>
                  <span>
                    {project.branch} · {project.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <DashboardEmpty text="Your projects will appear here when you create or join one." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Recent questions</h3>
            <Link to="/questions">Browse Q&amp;A</Link>
          </div>
          {modules['question-board'] ? (
            data.recentQuestions.length ? (
              <div className="dashboard-records">
                {data.recentQuestions.map((item) => (
                  <Link className="dashboard-record" key={item._id} to={`/questions/${item._id}`}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.answersCount} answers · {item.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <DashboardEmpty text="Questions you ask will appear here." />
            )
          ) : (
            <DashboardEmpty text="Engineering Q&A is disabled by your administrator." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Trending discussions</h3>
            <Link to="/community">Open community</Link>
          </div>
          {modules['community-hub'] ? (
            data.trendingPosts.length ? (
              <div className="dashboard-records">
                {data.trendingPosts.map((item) => (
                  <div className="dashboard-record" key={item._id}>
                    <strong>{item.body}</strong>
                    <span>
                      {item.author?.name} · {item.likes?.length || 0} likes
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <DashboardEmpty text="There are no community discussions yet." />
            )
          ) : (
            <DashboardEmpty text="Community Hub is disabled by your administrator." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Recommended resources</h3>
            <Link to="/library">Explore library</Link>
          </div>
          {modules['engineering-library'] ? (
            data.recommendedResources.length ? (
              <div className="dashboard-records">
                {data.recommendedResources.map((item) => (
                  <Link className="dashboard-record" key={item._id} to="/library">
                    <strong>{item.title}</strong>
                    <span>
                      {item.category} · {item.rating ? `${item.rating}/5` : 'Not rated yet'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <DashboardEmpty text="No approved resources match your branch yet." />
            )
          ) : (
            <DashboardEmpty text="The knowledge library is disabled by your administrator." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Upcoming events</h3>
          </div>
          {data.recommendations.events.length ? (
            <DashboardRecords items={data.recommendations.events} />
          ) : (
            <DashboardEmpty text="No event listings are available from a connected event source." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Recommended jobs</h3>
          </div>
          {data.recommendations.jobs.length ? (
            <DashboardRecords items={data.recommendations.jobs} />
          ) : (
            <DashboardEmpty text="No job listings are available from a connected career source." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Recent notifications</h3>
            <Link to="/notifications">View all</Link>
          </div>
          {data.notifications.length ? (
            <div className="dashboard-records">
              {data.notifications.map((item) => (
                <div className="dashboard-record" key={item._id}>
                  <strong>{item.message}</strong>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmpty text="Notifications about your activity will appear here." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Activity summary</h3>
          </div>
          {data.activity.length ? (
            <div className="dashboard-records">
              {data.activity.map((item, index) => (
                <div className="dashboard-record" key={`${item.type}-${item.createdAt}-${index}`}>
                  <strong>{item.message}</strong>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmpty text="Your project, question, and community activity will appear here." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Saved resources</h3>
            <Link to="/library">Open saved library</Link>
          </div>
          {data.saved.resources.length ? (
            <div className="dashboard-records">
              {data.saved.resources.map((item) => (
                <Link className="dashboard-record" key={item._id} to="/library">
                  <strong>{item.title}</strong>
                  <span>
                    {item.branch} · {item.category}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <DashboardEmpty text="Resources you bookmark will be listed here." />
          )}
        </Card>
        <Card className="workspace-card">
          <div className="workspace-card-heading">
            <h3>Followed engineers</h3>
            <Link to="/engineers">Discover engineers</Link>
          </div>
          {data.followedEngineers.length ? (
            <div className="dashboard-records">
              {data.followedEngineers.map((item) => (
                <Link className="dashboard-record" key={item._id} to={`/engineers/${item._id}`}>
                  <strong>{item.name}</strong>
                  <span>
                    {item.branch} · {item.userType}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <DashboardEmpty text="Engineers you follow will appear here." />
          )}
        </Card>
      </div>
    </section>
  );
}

function DashboardStat({ label, value, to }) {
  return (
    <Link className="dashboard-stat" to={to}>
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </Link>
  );
}

function DashboardEmpty({ text }) {
  return <p className="dashboard-empty">{text}</p>;
}

function DashboardRecords({ items }) {
  return (
    <div className="dashboard-records">
      {items.map((item) => (
        <div className="dashboard-record" key={item.id}>
          <strong>{item.title}</strong>
          <span>{item.date || item.organization || ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ initialAdmin = false }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const notify = useToast();
  const [features, setFeatures] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [search, setSearch] = useState('');
  const [moduleTab, setModuleTab] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 3;

  const loadFeatures = useCallback(async () => {
    try {
      const { data } = await api.get('/features');
      setFeatures(data.features);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load platform modules.');
    } finally {
      setLoading(false);
    }
  }, []);
  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const { data } = await api.get('/dashboard');
      setDashboard(data);
      setDashboardError('');
    } catch (requestError) {
      setDashboardError(
        requestError.response?.data?.message || 'Unable to load your dashboard data.',
      );
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    if (initialAdmin) document.getElementById('admin')?.scrollIntoView({ behavior: 'smooth' });
  }, [initialAdmin, loading]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmSignOut(false);
    } catch (requestError) {
      notify(
        requestError.response?.data?.message || 'Could not sign out. Please try again.',
        'error',
      );
      setSigningOut(false);
    }
  }

  const enabledCount = features.filter((feature) => feature.enabled).length;
  const filteredFeatures = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return features.filter((feature) => {
      if (user.role !== 'admin' && !feature.enabled) return false;
      if (moduleTab === 'enabled' && !feature.enabled) return false;
      if (moduleTab === 'paused' && feature.enabled) return false;
      return (
        !normalizedSearch ||
        `${feature.name} ${feature.description}`.toLocaleLowerCase().includes(normalizedSearch)
      );
    });
  }, [features, moduleTab, search, user.role]);
  const pageCount = Math.ceil(filteredFeatures.length / pageSize);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visibleFeatures = filteredFeatures.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">E</div>
          <div>
            <strong>EngineerHub</strong>
            <small>Personal workspace</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav">
          <a className="side-link active" href="#overview" onClick={() => setMenuOpen(false)}>
            <Gauge size={17} /> Overview <span className="nav-active-mark" />
          </a>
          <a className="side-link" href="#modules" onClick={() => setMenuOpen(false)}>
            <Blocks size={17} /> Platform modules
          </a>
          {user.role === 'admin' && (
            <a className="side-link" href="#admin" onClick={() => setMenuOpen(false)}>
              <Settings2 size={17} /> Feature controls
            </a>
          )}
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-label">YOUR SPACE</div>
        <div className="sidebar-note">
          <div className="sidebar-note-icon">
            <Command size={15} />
          </div>
          <div>
            <strong>Built to connect</strong>
            <p>Your engineering work, all in one place.</p>
          </div>
        </div>
        <div className="sidebar-bottom">
          <a
            className="side-link"
            href="mailto:support@engineerhub.app?subject=EngineerHub%20support"
          >
            <CircleHelp size={17} /> Help & support
          </a>
          <div className="sidebar-user">
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Administrator' : 'Member'}</small>
            </div>
            <Tooltip label="Sign out">
              <Button
                aria-label="Sign out"
                className="signout-button"
                disabled={signingOut}
                onClick={() => setConfirmSignOut(true)}
                size="icon"
                variant="ghost"
              >
                <LogOut size={17} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              aria-controls="workspace-sidebar"
              aria-expanded={menuOpen}
              aria-label="Open navigation"
              className="mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              Workspace <span>/</span> <strong>Overview</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-date">
              <Activity size={15} /> Your engineering workspace
            </div>
            <Tooltip label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              <Button
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                className="theme-toggle"
                onClick={toggleTheme}
                size="icon"
                variant="secondary"
              >
                {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              </Button>
            </Tooltip>
            <Dropdown
              label="Account menu"
              trigger={<span className="topbar-avatar">{user.name.charAt(0).toUpperCase()}</span>}
            >
              <div
                aria-label={`Signed in as ${user.name}`}
                className="ui-dropdown-heading"
                role="group"
              >
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <a className="ui-dropdown-item" href="/sessions" role="menuitem">
                <ShieldCheck size={15} /> Active sessions
              </a>
              <button
                className="ui-dropdown-item ui-dropdown-danger"
                onClick={() => setConfirmSignOut(true)}
                role="menuitem"
                type="button"
              >
                <LogOut size={15} /> Sign out
              </button>
            </Dropdown>
          </div>
        </header>

        <div className="page-content" id="overview">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">YOUR NEXT IDEA STARTS HERE</div>
              <h1>
                Good to have you, {user.name.split(' ')[0]} <span className="wave">✦</span>
              </h1>
              <p>Your engineering workspace is ready. Here’s where things stand.</p>
            </div>
            <div className="welcome-date">
              <span className="date-dot" /> WORKSPACE STATUS <strong>Workspace active</strong>
            </div>
          </section>

          {error && (
            <ErrorState
              description={error}
              action={
                <Button onClick={loadFeatures} variant="secondary">
                  Try again
                </Button>
              }
            />
          )}

          <section className="metrics-grid" aria-label="Workspace summary">
            <article className="metric-card">
              <div className="metric-head">
                <span>AVAILABLE MODULES</span>
                <span className="metric-icon blue">
                  <Blocks size={18} />
                </span>
              </div>
              <div className="metric-value">
                {loading ? '—' : enabledCount}
                <span> / {loading ? '—' : features.length}</span>
              </div>
              <div className="metric-foot">
                <span className="metric-trend">
                  <ArrowUpRight size={14} /> Ready to explore
                </span>
                <span>Platform features</span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-head">
                <span>YOUR ROLE</span>
                <span className="metric-icon violet">
                  <ShieldCheck size={18} />
                </span>
              </div>
              <div className="metric-role">
                {user.role === 'admin' ? 'Administrator' : 'Member'}
              </div>
              <div className="metric-foot">
                <span className="metric-trend">
                  <Check size={14} /> Active account
                </span>
                <span>Access level</span>
              </div>
            </article>
            <article className="metric-card metric-card-highlight">
              <div className="metric-head">
                <span>ENGINEERHUB</span>
                <span className="metric-icon mint">
                  <Database size={18} />
                </span>
              </div>
              <div className="metric-value metric-word">Your space, connected</div>
              <div className="metric-foot">
                <span className="metric-trend">
                  <ArrowDownRight size={14} /> Built for engineering
                </span>
                <span>One platform</span>
              </div>
            </article>
          </section>

          <DashboardInsights
            data={dashboard}
            error={dashboardError}
            loading={dashboardLoading}
            onRetry={loadDashboard}
          />

          <section className="modules-section" id="modules">
            <div className="section-heading">
              <div>
                <div className="eyebrow">THE PLATFORM</div>
                <h2>Engineering, all in one place</h2>
                <p>Explore the capabilities available in your workspace.</p>
              </div>
              <Badge className="module-count" tone="neutral">
                {loading ? 'Loading' : `${enabledCount} of ${features.length} available`}
              </Badge>
            </div>
            {user.role === 'admin' && !loading && features.length > 0 && (
              <Tabs
                label="Filter modules"
                onChange={(value) => {
                  setModuleTab(value);
                  setPage(1);
                }}
                panelId="module-results"
                tabs={[
                  { label: 'All modules', value: 'all', count: features.length },
                  { label: 'Enabled', value: 'enabled', count: enabledCount },
                  { label: 'Paused', value: 'paused', count: features.length - enabledCount },
                ]}
                value={moduleTab}
              />
            )}
            {!loading && !error && features.length > 0 && (
              <SearchBar
                className="module-search"
                label="Search platform modules"
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Search modules..."
                value={search}
              />
            )}
            <div
              aria-labelledby={
                user.role === 'admin' && !loading && features.length > 0
                  ? `module-results-tab-${moduleTab}`
                  : undefined
              }
              className="module-results"
              id={
                user.role === 'admin' && !loading && features.length > 0
                  ? 'module-results'
                  : undefined
              }
              role={
                user.role === 'admin' && !loading && features.length > 0 ? 'tabpanel' : undefined
              }
              tabIndex={user.role === 'admin' && !loading && features.length > 0 ? 0 : undefined}
            >
              {loading ? (
                <div className="loading-grid">
                  {[1, 2, 3].map((item) => (
                    <div className="skeleton-card" key={item}>
                      <LoadingSkeleton lines={3} />
                    </div>
                  ))}
                </div>
              ) : error ? null : filteredFeatures.length > 0 ? (
                <>
                  <div className="feature-grid">
                    {visibleFeatures.map((feature) => (
                      <FeatureCard feature={feature} key={feature.key} />
                    ))}
                  </div>
                  <Pagination onPageChange={setPage} page={currentPage} pageCount={pageCount} />
                </>
              ) : features.length > 0 ? (
                <EmptyState
                  description={
                    search
                      ? 'Try a different search or module filter.'
                      : 'No modules match this filter.'
                  }
                  icon={Blocks}
                  title="No matching modules"
                  action={
                    search ? (
                      <Button
                        onClick={() => {
                          setSearch('');
                          setModuleTab('all');
                          setPage(1);
                        }}
                        variant="secondary"
                      >
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <EmptyState
                  description="Contact your workspace administrator for assistance."
                  icon={Blocks}
                  title="No platform modules are configured"
                />
              )}
            </div>
          </section>

          {user.role === 'admin' && <AdminPanel features={features} onUpdated={loadFeatures} />}
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} EngineerHub</span>
            <span>Designed for the people who build what’s next.</span>
          </footer>
        </div>
      </main>
      <ConfirmDialog
        busy={signingOut}
        confirmLabel="Sign out"
        description="You will need to sign in again to access your engineering workspace."
        onClose={() => setConfirmSignOut(false)}
        onConfirm={handleSignOut}
        open={confirmSignOut}
        title="Sign out of EngineerHub?"
      />
    </div>
  );
}
