import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, CalendarDays, Paperclip, Plus, Send, UserPlus, UsersRound } from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingSkeleton, Select, useToast } from '../components/ui.jsx';

const taskStatuses = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
];
const priorities = ['low', 'medium', 'high', 'urgent'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [comment, setComment] = useState('');
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({});
  const [busy, setBusy] = useState('');
  const notify = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: response } = await api.get(`/projects/${projectId}`);
      setData(response);
      setProjectForm({
        name: response.project.name,
        description: response.project.description,
        category: response.project.category,
        branch: response.project.branch,
        visibility: response.project.visibility,
        startDate: response.project.startDate?.slice(0, 10) || '',
        endDate: response.project.endDate?.slice(0, 10) || '',
      });
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load project.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const activeMembers = useMemo(() => (data?.project.members || []).filter((member) => member.status === 'active' && member.user), [data]);

  async function createTask(event) {
    event.preventDefault();
    setBusy('task');
    try {
      await api.post(`/projects/${projectId}/tasks`, taskForm);
      setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '' });
      await load();
      notify('Task added to the project.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to create task.', 'error');
    } finally {
      setBusy('');
    }
  }

  async function updateTask(task, updates) {
    try {
      await api.patch(`/projects/${projectId}/tasks/${task._id}`, updates);
      await load();
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update task.', 'error');
    }
  }

  async function inviteMember(event) {
    event.preventDefault();
    setBusy('invite');
    try {
      await api.post(`/projects/${projectId}/invitations`, inviteForm);
      setInviteForm({ email: '', role: 'viewer' });
      await load();
      notify('Project invitation sent.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to invite this account.', 'error');
    } finally {
      setBusy('');
    }
  }

  async function saveProject(event) {
    event.preventDefault();
    setBusy('project');
    try {
      await api.patch(`/projects/${projectId}`, projectForm);
      setProjectFormOpen(false);
      await load();
      notify('Project details updated.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update project.', 'error');
    } finally {
      setBusy('');
    }
  }

  async function updateMember(memberId, role) {
    try {
      await api.patch(`/projects/${projectId}/members/${memberId}`, { role });
      await load();
      notify('Project role updated.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update member role.', 'error');
    }
  }

  async function removeMember(memberId) {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      await load();
      notify('Project member removed.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to remove member.', 'error');
    }
  }

  async function addComment(event) {
    event.preventDefault();
    try {
      await api.post(`/projects/${projectId}/comments`, { body: comment });
      setComment('');
      await load();
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to add comment.', 'error');
    }
  }

  async function uploadAttachment(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/projects/${projectId}/attachments`, formData);
      await load();
      notify('Project attachment uploaded.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to upload attachment.', 'error');
    } finally {
      event.target.value = '';
    }
  }

  async function setComplete() {
    try {
      await api.patch(`/projects/${projectId}`, { status: data.project.status === 'completed' ? 'active' : 'completed' });
      await load();
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update project status.', 'error');
    }
  }

  async function archiveProject() {
    if (!window.confirm('Archive this project? Project files will no longer be accessible to members.')) return;
    try {
      await api.delete(`/projects/${projectId}`);
      navigate('/projects', { replace: true });
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to archive project.', 'error');
    }
  }

  if (loading) return <div className="workspace-page"><LoadingSkeleton className="skeleton-card" lines={6} /></div>;
  if (error || !data) return <div className="workspace-page"><ErrorState description={error || 'Project unavailable.'} action={<Button onClick={load} variant="secondary">Try again</Button>} /></div>;
  const { project, permissions } = data;
  const taskGroups = Object.fromEntries(taskStatuses.map(({ value }) => [value, data.tasks.filter((task) => task.status === value)]));

  return (
    <div className="workspace-page">
      <header className="page-heading project-detail-heading"><div><div className="eyebrow">{project.branch} · {project.category}</div><h1>{project.name}</h1><p>{project.description}</p></div><div className="inline-form">
        <Badge tone={project.status === 'completed' ? 'success' : 'brand'}>{project.status}</Badge>
        {permissions.isOwner && <><Button onClick={() => setProjectFormOpen((value) => !value)} size="sm" variant="secondary">Edit details</Button><Button onClick={setComplete} size="sm" variant="secondary">{project.status === 'completed' ? 'Reopen' : 'Mark complete'}</Button><Button onClick={archiveProject} size="sm" variant="danger">Archive</Button></>}
      </div></header>
      {projectFormOpen && <Card className="workspace-card"><form className="module-form" onSubmit={saveProject}><h2>Edit project</h2><div className="form-grid">
        <Input label="Name" onChange={(event) => setProjectForm((value) => ({ ...value, name: event.target.value }))} value={projectForm.name} />
        <Input label="Category" onChange={(event) => setProjectForm((value) => ({ ...value, category: event.target.value }))} value={projectForm.category} />
        <Select label="Visibility" onChange={(event) => setProjectForm((value) => ({ ...value, visibility: event.target.value }))} options={[{ value: 'private', label: 'Private' }, { value: 'members', label: 'Members' }, { value: 'public', label: 'Public' }]} value={projectForm.visibility} />
        <Input label="Start date" onChange={(event) => setProjectForm((value) => ({ ...value, startDate: event.target.value }))} type="date" value={projectForm.startDate} />
        <Input label="End date" onChange={(event) => setProjectForm((value) => ({ ...value, endDate: event.target.value }))} type="date" value={projectForm.endDate} />
        <label className="ui-field form-full"><span className="ui-field-label">Description</span><textarea className="ui-input ui-textarea" onChange={(event) => setProjectForm((value) => ({ ...value, description: event.target.value }))} rows={4} value={projectForm.description} /></label>
      </div><div className="form-actions"><Button loading={busy === 'project'} type="submit">Save changes</Button><Button onClick={() => setProjectFormOpen(false)} variant="secondary">Cancel</Button></div></form></Card>}

      <div className="project-summary-strip"><div><strong>{data.progress}%</strong><span>Project progress</span></div><div><strong>{data.tasks.filter((task) => task.status === 'completed').length}/{data.tasks.length}</strong><span>Tasks completed</span></div><div><strong>{activeMembers.length}</strong><span>Active members</span></div></div>
      <section className="project-work-section">
        <div className="section-heading"><div><h2>Task board</h2><p>Update status as project work moves through review.</p></div></div>
        {permissions.canEdit && project.status !== 'completed' && <Card className="workspace-card"><form className="task-create-form" onSubmit={createTask}><Input aria-label="Task name" maxLength={160} onChange={(event) => setTaskForm((value) => ({ ...value, title: event.target.value }))} placeholder="New task title" required value={taskForm.title} /><Select aria-label="Task priority" onChange={(event) => setTaskForm((value) => ({ ...value, priority: event.target.value }))} options={priorities} value={taskForm.priority} /><Input aria-label="Task deadline" onChange={(event) => setTaskForm((value) => ({ ...value, dueDate: event.target.value }))} type="date" value={taskForm.dueDate} /><Button loading={busy === 'task'} type="submit"><Plus size={15} /> Add task</Button></form><Input className="task-description-input" aria-label="Task details" maxLength={3000} onChange={(event) => setTaskForm((value) => ({ ...value, description: event.target.value }))} placeholder="Task details (optional)" value={taskForm.description} /></Card>}
        {data.tasks.length ? <div className="kanban-board">{taskStatuses.map(({ value, label }) => <section className="kanban-column" key={value}><header><h3>{label}</h3><span>{taskGroups[value].length}</span></header>{taskGroups[value].map((task) => <TaskCard activeMembers={activeMembers} canEdit={permissions.canEdit} currentUserId={user.id} key={task._id} onDelete={async () => { if (!window.confirm('Delete this task?')) return; try { await api.delete(`/projects/${projectId}/tasks/${task._id}`); await load(); } catch (requestError) { notify(requestError.response?.data?.message || 'Unable to delete task.', 'error'); } }} onUpdate={(updates) => updateTask(task, updates)} task={task} />)}</section>)}</div> : <EmptyState title="No tasks yet" description={permissions.canEdit ? 'Add the first task to your board.' : 'Project tasks will appear here.'} />}
      </section>

      <div className="project-detail-grid">
        <Card className="workspace-card"><div className="workspace-card-heading"><h2><UsersRound size={17} /> Project members</h2>{permissions.isOwner && <p>Invite active EngineerHub accounts and manage access.</p>}</div>
          {permissions.isOwner && <form className="inline-form invite-form" onSubmit={inviteMember}><Input aria-label="Member email" onChange={(event) => setInviteForm((value) => ({ ...value, email: event.target.value }))} placeholder="Member email" required type="email" value={inviteForm.email} /><Select aria-label="Invitation role" onChange={(event) => setInviteForm((value) => ({ ...value, role: event.target.value }))} options={[{ value: 'viewer', label: 'Viewer' }, { value: 'editor', label: 'Editor' }]} value={inviteForm.role} /><Button loading={busy === 'invite'} size="sm" type="submit"><UserPlus size={14} /> Invite</Button></form>}
          <div className="member-list">{project.members.filter((member) => member.status === 'active' && member.user).map((member) => {
            const memberId = member.user._id || member.user;
            return <div className="member-row" key={memberId}><span className="user-avatar">{member.user.name?.charAt(0)?.toUpperCase() || 'E'}</span><div><strong>{member.user.name || 'Member'}</strong><small>{member.role}</small></div>{permissions.isOwner && String(memberId) !== String(user.id) && <div className="inline-form"><Select aria-label={`Role for ${member.user.name}`} onChange={(event) => updateMember(memberId, event.target.value)} options={[{ value: 'editor', label: 'Editor' }, { value: 'viewer', label: 'Viewer' }]} value={member.role === 'owner' ? 'editor' : member.role} /><Button aria-label={`Remove ${member.user.name}`} onClick={() => removeMember(memberId)} size="sm" variant="ghost">Remove</Button></div>}</div>;
          })}</div>
          {project.members.some((member) => member.status === 'invited') && <p className="form-note">Pending invitations: {project.members.filter((member) => member.status === 'invited').length}</p>}
        </Card>
        <Card className="workspace-card"><div className="workspace-card-heading"><h2><Paperclip size={17} /> Attachments</h2></div>
          {permissions.canEdit && <label className="upload-control"><Paperclip size={15} /> Add document<input accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv" onChange={uploadAttachment} type="file" /></label>}
          {data.attachments.length ? data.attachments.map((file) => <a className="attachment-link" href={file.downloadUrl} key={file.id} rel="noreferrer" target="_blank">{file.fileName}<span>{file.format}</span></a>) : <p className="form-note">No attachments have been added.</p>}
        </Card>
      </div>
      <div className="project-detail-grid">
        <Card className="workspace-card"><div className="workspace-card-heading"><h2>Project discussion</h2><p>Share progress and coordinate with project members.</p></div>
          {permissions.isMember && <form className="inline-form" onSubmit={addComment}><Input aria-label="Project comment" maxLength={3000} onChange={(event) => setComment(event.target.value)} placeholder="Write a project comment..." required value={comment} /><Button size="sm" type="submit"><Send size={14} /> Post</Button></form>}
          <div className="record-list compact-list">{data.comments.map((item) => <div className="comment-row" key={item._id}><strong>{item.author?.name}</strong><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleString()}</small></div>)}</div>
        </Card>
        <Card className="workspace-card"><div className="workspace-card-heading"><h2><Activity size={17} /> Activity history</h2></div><div className="activity-list">{data.activities.map((item) => <div className="activity-row" key={item._id}><span className="activity-dot" /><div><strong>{item.actor?.name}</strong><span>{item.detail || item.action.replace('_', ' ')}</span><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>)}</div></Card>
      </div>
    </div>
  );
}

function TaskCard({ task, activeMembers, canEdit, currentUserId, onUpdate, onDelete }) {
  const assignedToMe = String(task.assignee?._id || task.assignee || '') === String(currentUserId);
  const canChangeStatus = canEdit || assignedToMe;
  return <Card className="task-card"><div className="task-card-heading"><strong>{task.title}</strong>{canEdit && <button aria-label={`Delete ${task.title}`} className="task-remove" onClick={onDelete} type="button">×</button>}</div>
    {task.description && <p>{task.description}</p>}
    <div className="task-card-meta"><Badge tone={task.priority === 'urgent' || task.priority === 'high' ? 'error' : 'neutral'}>{task.priority}</Badge>{task.dueDate && <span><CalendarDays size={13} /> {new Date(task.dueDate).toLocaleDateString()}</span>}</div>
    {canChangeStatus && <Select aria-label={`Status for ${task.title}`} onChange={(event) => onUpdate({ status: event.target.value })} options={taskStatuses} value={task.status} />}
    {canEdit && <Select aria-label={`Assignee for ${task.title}`} onChange={(event) => onUpdate({ assignee: event.target.value })} options={[{ value: '', label: 'Unassigned' }, ...activeMembers.map((member) => ({ value: member.user._id, label: member.user.name }))]} value={task.assignee?._id || task.assignee || ''} />}
    {task.assignee && <small className="task-assignee">Assigned to {task.assignee.name || 'project member'}</small>}
  </Card>;
}
