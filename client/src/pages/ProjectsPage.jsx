import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Blocks, CalendarDays, Plus, UsersRound } from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingSkeleton, Pagination, Select, useToast } from '../components/ui.jsx';

const branches = [
  'aerospace', 'biomedical', 'chemical', 'civil', 'computer', 'electrical',
  'environmental', 'industrial', 'materials', 'mechanical', 'other',
].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [invitations, setInvitations] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState('active');
  const [form, setForm] = useState({ name: '', description: '', category: '', branch: user.branch, visibility: 'private' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const notify = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectResponse, invitationResponse] = await Promise.all([
        api.get('/projects', { params: { status: filter, page, limit: 12 } }),
        api.get('/projects/invitations'),
      ]);
      setProjects(projectResponse.data.projects);
      setPageCount(projectResponse.data.pagination.pageCount);
      setInvitations(invitationResponse.data.invitations);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);
  useEffect(() => { load(); }, [load]);

  async function createProject(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/projects', form);
      setFormOpen(false);
      setForm({ name: '', description: '', category: '', branch: user.branch, visibility: 'private' });
      await load();
      notify('Project created.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to create project.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function respond(projectId, response) {
    try {
      await api.post(`/projects/invitations/${projectId}/respond`, { response });
      await load();
      notify(response === 'accept' ? 'Project invitation accepted.' : 'Invitation declined.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update invitation.', 'error');
    }
  }

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><div className="eyebrow">PROJECT STUDIO</div><h1>Engineering projects</h1><p>Plan work, bring collaborators together, and track delivery.</p></div><Button onClick={() => setFormOpen((value) => !value)}><Plus size={16} /> New project</Button></header>
      {invitations.length > 0 && <Card className="workspace-card"><div className="workspace-card-heading"><h2>Project invitations</h2><p>Invitations are sent to active EngineerHub accounts.</p></div><div className="record-list compact-list">{invitations.map((invitation) => <div className="invitation-row" key={invitation.projectId}><div><strong>{invitation.name}</strong><span>Invited by {invitation.owner?.name}</span></div><div className="inline-form"><Button onClick={() => respond(invitation.projectId, 'accept')} size="sm">Accept</Button><Button onClick={() => respond(invitation.projectId, 'reject')} size="sm" variant="secondary">Decline</Button></div></div>)}</div></Card>}
      {formOpen && <Card className="workspace-card"><form className="module-form" onSubmit={createProject}><div className="workspace-card-heading"><h2>Create a project</h2><p>Set a project scope and visibility before inviting collaborators.</p></div>
        <div className="form-grid"><Input label="Project name" maxLength={120} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required value={form.name} /><Input label="Category" maxLength={80} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} placeholder="Research, design, capstone..." required value={form.category} /><Select label="Engineering branch" onChange={(event) => setForm((value) => ({ ...value, branch: event.target.value }))} options={branches} value={form.branch} /><Select label="Visibility" onChange={(event) => setForm((value) => ({ ...value, visibility: event.target.value }))} options={[{ value: 'private', label: 'Private' }, { value: 'members', label: 'Members only' }, { value: 'public', label: 'Public' }]} value={form.visibility} /><label className="ui-field form-full"><span className="ui-field-label">Project description</span><textarea className="ui-input ui-textarea" maxLength={5000} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} required rows={4} value={form.description} /></label></div>
        <div className="form-actions"><Button loading={busy} type="submit">Create project</Button><Button onClick={() => setFormOpen(false)} variant="secondary">Cancel</Button></div>
      </form></Card>}
      <div className="filter-toolbar"><Select aria-label="Filter project status" onChange={(event) => { setFilter(event.target.value); setPage(1); }} options={[{ value: 'active', label: 'Active projects' }, { value: 'completed', label: 'Completed projects' }]} value={filter} /></div>
      {error ? <ErrorState description={error} action={<Button onClick={load} variant="secondary">Try again</Button>} /> : loading ? <LoadingSkeleton className="skeleton-card" lines={4} /> : projects.length ? (
        <div className="project-grid">{projects.map((project) => <ProjectCard key={project._id} project={project} />)}</div>
      ) : <EmptyState icon={Blocks} title="No projects yet" description={filter === 'completed' ? 'Completed projects will appear here.' : 'Create a project to start organizing engineering work.'} action={filter === 'active' ? <Button onClick={() => setFormOpen(true)}>Create a project</Button> : undefined} />}
      <Pagination onPageChange={setPage} page={page} pageCount={pageCount} />
    </div>
  );
}

function ProjectCard({ project }) {
  return <Card as="article" className="workspace-card project-card"><div className="project-card-top"><span className="project-icon"><Blocks size={18} /></span><Badge tone={project.status === 'completed' ? 'success' : 'brand'}>{project.status}</Badge></div>
    <h2><Link to={`/projects/${project._id}`}>{project.name}</Link></h2><p>{project.description}</p>
    <div className="project-card-meta"><span>{project.branch} · {project.category}</span><span><UsersRound size={14} /> {project.members?.filter((member) => member.status === 'active').length || 1} members</span></div>
    <div className="project-progress"><div className="project-progress-heading"><span>Progress</span><strong>{project.progress || 0}%</strong></div><div className="progress-track"><i style={{ width: `${project.progress || 0}%` }} /></div><small>{project.completedTasks || 0} of {project.taskCount || 0} tasks complete</small></div>
    <div className="project-card-footer"><span><CalendarDays size={14} /> Updated {new Date(project.updatedAt).toLocaleDateString()}</span><Link to={`/projects/${project._id}`}>Open project</Link></div>
  </Card>;
}
