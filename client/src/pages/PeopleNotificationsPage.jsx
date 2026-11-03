import { useCallback, useEffect, useState } from 'react';
import { Bell, UsersRound } from 'lucide-react';
import api from '../api.js';
import { Button, Card, EmptyState, ErrorState, Input, LoadingSkeleton, Pagination, Select, useToast } from '../components/ui.jsx';

const branches = [
  { value: '', label: 'All branches' },
  ...['aerospace', 'biomedical', 'chemical', 'civil', 'computer', 'electrical', 'environmental', 'industrial', 'materials', 'mechanical', 'other']
    .map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
];

export function EngineerDirectoryPage() {
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notify = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/profile/users', { params: { page, limit: 12, search, branch } });
      setProfiles(data.profiles);
      setPageCount(data.pagination.pageCount);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load engineer profiles.');
    } finally {
      setLoading(false);
    }
  }, [branch, page, search]);
  useEffect(() => { load(); }, [load]);

  async function toggleFollow(profile) {
    try {
      const { data } = await api.post(`/profile/users/${profile.user.id}/follow`);
      setProfiles((current) => current.map((item) => item.user.id === profile.user.id
        ? { ...item, followedByMe: data.following }
        : item));
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update follow status.', 'error');
    }
  }

  return <div className="workspace-page"><header className="page-heading"><div><div className="eyebrow">ENGINEERING NETWORK</div><h1>Discover engineers</h1><p>Find and follow public engineering profiles.</p></div></header>
    <div className="filter-toolbar"><Input aria-label="Search engineers by name" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search engineers..." value={search} /><Select aria-label="Filter engineer branch" onChange={(event) => { setBranch(event.target.value); setPage(1); }} options={branches} value={branch} /></div>
    {error ? <ErrorState description={error} action={<Button onClick={load} variant="secondary">Try again</Button>} /> : loading ? <LoadingSkeleton className="skeleton-card" lines={4} /> : profiles.length ? <div className="engineer-grid">{profiles.map((profile) => <Card className="workspace-card engineer-card" key={profile.user.id}>
      <a className="engineer-card-identity" href={`/engineers/${profile.user.id}`}><span className="user-avatar">{profile.user.name.charAt(0).toUpperCase()}</span><div><strong>{profile.user.name}</strong><span>{profile.headline || profile.branch}</span></div></a>
      <p>{profile.biography || 'This engineer has not added a biography.'}</p><div className="skill-list">{profile.skills.slice(0, 5).map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div>
      <Button onClick={() => toggleFollow(profile)} size="sm" variant={profile.followedByMe ? 'secondary' : 'primary'}>{profile.followedByMe ? 'Following' : 'Follow'}</Button>
    </Card>)}</div> : <EmptyState icon={UsersRound} title="No public profiles found" description={search || branch ? 'Try another search or branch.' : 'Public profiles will appear here when engineers complete their profiles.'} />}
    <Pagination onPageChange={setPage} page={page} pageCount={pageCount} />
  </div>;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notify = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { page, limit: 20 } });
      setNotifications(data.notifications);
      setUnread(data.unread);
      setPageCount(data.pagination.pageCount);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnread(0);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update notifications.', 'error');
    }
  }

  async function markRead(item) {
    if (item.readAt) return;
    try {
      const { data } = await api.patch(`/notifications/${item._id}/read`);
      setNotifications((current) => current.map((notification) => notification._id === item._id ? data.notification : notification));
      setUnread((value) => Math.max(0, value - 1));
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to mark notification as read.', 'error');
    }
  }

  function destination(item) {
    if (item.targetType === 'project') return `/projects/${item.target}`;
    if (item.targetType === 'question') return `/questions/${item.target}`;
    if (item.targetType === 'profile') return `/engineers/${item.target}`;
    if (item.targetType === 'resource') return '/library';
    return '/workspace';
  }

  return <div className="workspace-page"><header className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Notifications</h1><p>{unread} unread notification{unread === 1 ? '' : 's'}.</p></div>{unread > 0 && <Button onClick={markAllRead} variant="secondary">Mark all as read</Button>}</header>
    {error ? <ErrorState description={error} action={<Button onClick={load} variant="secondary">Try again</Button>} /> : loading ? <LoadingSkeleton className="skeleton-card" lines={4} /> : notifications.length ? <div className="record-list">{notifications.map((item) => <Card className={`workspace-card notification-card ${item.readAt ? '' : 'notification-unread'}`} key={item._id}>
      <span className="notification-icon"><Bell size={17} /></span><div><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div>
      <Button onClick={() => markRead(item)} size="sm" variant="ghost">{item.readAt ? 'Read' : 'Mark read'}</Button><a className="notification-open-link" href={destination(item)}>Open</a>
    </Card>)}</div> : <EmptyState icon={Bell} title="No notifications" description="Updates about your projects and community activity will appear here." />}
    <Pagination onPageChange={setPage} page={page} pageCount={pageCount} />
  </div>;
}
