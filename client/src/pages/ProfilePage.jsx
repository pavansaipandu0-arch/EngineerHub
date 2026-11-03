import { useCallback, useEffect, useState } from 'react';
import { Camera, Save, UserRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, EmptyState, ErrorState, Input, Select, useToast } from '../components/ui.jsx';

const branches = [
  'aerospace', 'biomedical', 'chemical', 'civil', 'computer', 'electrical',
  'environmental', 'industrial', 'materials', 'mechanical', 'other',
].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

function listText(items, fields) {
  return (items || []).map((item) => fields.map((field) => item[field] || '').join(' | ')).join('\n');
}

function parseList(value, fields) {
  return value.split('\n').map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean))
    .map((parts) => Object.fromEntries(fields.map((field, index) => [field, parts[index] || ''])));
}

function profileState(profile) {
  return {
    headline: profile.headline || '',
    biography: profile.biography || '',
    branch: profile.branch,
    organization: profile.organization || '',
    visibility: profile.visibility || 'public',
    skills: (profile.skills || []).join(', '),
    github: profile.links?.github || '',
    linkedin: profile.links?.linkedin || '',
    website: profile.links?.website || '',
    experience: listText(profile.experience, ['title', 'organization', 'startDate', 'endDate', 'description']),
    education: listText(profile.education, ['institution', 'degree', 'field', 'startDate', 'endDate']),
    certifications: listText(profile.certifications, ['name', 'issuer', 'issuedAt', 'credentialUrl']),
    portfolio: listText(profile.portfolio, ['title', 'description', 'url', 'branch']),
  };
}

export default function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const isOwn = !userId || userId === user.id;
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const notify = useToast();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = isOwn
        ? await api.get('/profile/me')
        : await api.get(`/profile/users/${userId}`);
      setProfile(data.profile);
      setForm(profileState(data.profile));
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load this profile.');
    } finally {
      setLoading(false);
    }
  }, [isOwn, userId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        headline: form.headline,
        biography: form.biography,
        branch: form.branch,
        organization: form.organization,
        visibility: form.visibility,
        skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
        links: { github: form.github, linkedin: form.linkedin, website: form.website },
        experience: parseList(form.experience, ['title', 'organization', 'startDate', 'endDate', 'description']),
        education: parseList(form.education, ['institution', 'degree', 'field', 'startDate', 'endDate']),
        certifications: parseList(form.certifications, ['name', 'issuer', 'issuedAt', 'credentialUrl']),
        portfolio: parseList(form.portfolio, ['title', 'description', 'url', 'branch']),
      };
      const { data } = await api.patch('/profile/me', payload);
      setProfile(data.profile);
      setForm(profileState(data.profile));
      notify('Profile saved.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      const response = await api.post('/profile/me/photo', data);
      setProfile(response.data.profile);
      notify('Profile photo updated.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to upload profile photo.', 'error');
    } finally {
      event.target.value = '';
    }
  }

  async function toggleFollow() {
    try {
      const { data } = await api.post(`/profile/users/${profile.user.id}/follow`);
      setProfile((current) => ({ ...current, followedByMe: data.following }));
      notify(data.following ? 'Engineer followed.' : 'Engineer unfollowed.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update follow status.', 'error');
    }
  }

  if (loading) return <div className="workspace-page"><div className="loading-grid"><Card className="skeleton-card"><div className="ui-skeleton-group"><span className="ui-skeleton" /><span className="ui-skeleton" /></div></Card></div></div>;
  if (error) return <div className="workspace-page"><ErrorState description={error} action={<Button onClick={loadProfile} variant="secondary">Try again</Button>} /></div>;
  if (!profile || !form) return <div className="workspace-page"><EmptyState icon={UserRound} title="Profile unavailable" /></div>;

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div><div className="eyebrow">ENGINEER PROFILE</div><h1>{isOwn ? 'Your profile' : profile.user.name}</h1>
          <p>Share your engineering experience, skills, and work with the community.</p></div>
        {!isOwn && <Button onClick={toggleFollow} variant={profile.followedByMe ? 'secondary' : 'primary'}>{profile.followedByMe ? 'Following' : 'Follow engineer'}</Button>}
      </header>
      <div className="profile-summary-card">
        <div className="profile-photo-wrap">
          {profile.photo.url ? <img alt={`${profile.user.name} profile`} className="profile-photo" src={profile.photo.url} /> : <div className="profile-photo profile-photo-placeholder">{profile.user.name?.charAt(0)?.toUpperCase()}</div>}
          {isOwn && <label className="profile-photo-action" title="Upload profile photo"><Camera size={16} /><input accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} type="file" /></label>}
        </div>
        <div className="profile-summary">
          <h2>{profile.user.name}</h2><p>{profile.headline || 'Engineering professional'}</p>
          <div className="profile-meta"><span>{profile.branch}</span>{profile.organization && <span>{profile.organization}</span>}</div>
          {!isOwn && <span className="profile-meta">{profile.followers} followers · {profile.following} following</span>}
        </div>
        {isOwn && <div className="profile-completion"><strong>{profile.completion}%</strong><span>Profile completion</span><div><i style={{ width: `${profile.completion}%` }} /></div></div>}
      </div>

      {isOwn ? (
        <form className="profile-form" onSubmit={saveProfile}>
          <Card className="workspace-card">
            <div className="workspace-card-heading"><h2>Professional details</h2><p>Keep your profile accurate and useful to collaborators.</p></div>
            <div className="form-grid">
              <Input label="Professional headline" maxLength={160} onChange={(event) => change('headline', event.target.value)} value={form.headline} />
              <Input label="College or organization" maxLength={120} onChange={(event) => change('organization', event.target.value)} value={form.organization} />
              <Select label="Engineering branch" onChange={(event) => change('branch', event.target.value)} options={branches} value={form.branch} />
              <Select label="Profile visibility" onChange={(event) => change('visibility', event.target.value)} options={[{ value: 'public', label: 'Public profile' }, { value: 'private', label: 'Private profile' }]} value={form.visibility} />
              <label className="ui-field form-full"><span className="ui-field-label">Biography</span><textarea className="ui-input ui-textarea" maxLength={3000} onChange={(event) => change('biography', event.target.value)} rows={5} value={form.biography} /></label>
              <Input className="form-full" label="Technical skills (comma separated)" maxLength={1600} onChange={(event) => change('skills', event.target.value)} value={form.skills} />
            </div>
          </Card>
          <Card className="workspace-card">
            <div className="workspace-card-heading"><h2>Experience and education</h2><p>One record per line, using the field order shown.</p></div>
            <div className="form-grid">
              <label className="ui-field"><span className="ui-field-label">Work experience</span><textarea className="ui-input ui-textarea code-list-input" onChange={(event) => change('experience', event.target.value)} placeholder="Title | Organization | Start date | End date | Description" rows={6} value={form.experience} /></label>
              <label className="ui-field"><span className="ui-field-label">Education</span><textarea className="ui-input ui-textarea code-list-input" onChange={(event) => change('education', event.target.value)} placeholder="Institution | Degree | Field | Start date | End date" rows={6} value={form.education} /></label>
              <label className="ui-field"><span className="ui-field-label">Certifications</span><textarea className="ui-input ui-textarea code-list-input" onChange={(event) => change('certifications', event.target.value)} placeholder="Name | Issuer | Issued date | Credential URL" rows={5} value={form.certifications} /></label>
              <label className="ui-field"><span className="ui-field-label">Project portfolio</span><textarea className="ui-input ui-textarea code-list-input" onChange={(event) => change('portfolio', event.target.value)} placeholder="Title | Description | HTTPS URL | Engineering branch" rows={5} value={form.portfolio} /></label>
            </div>
          </Card>
          <Card className="workspace-card">
            <div className="workspace-card-heading"><h2>Professional links</h2><p>Use secure HTTPS links to your professional profiles.</p></div>
            <div className="form-grid">
              <Input label="GitHub" onChange={(event) => change('github', event.target.value)} placeholder="https://github.com/username" value={form.github} />
              <Input label="LinkedIn" onChange={(event) => change('linkedin', event.target.value)} placeholder="https://linkedin.com/in/username" value={form.linkedin} />
              <Input className="form-full" label="Personal website" onChange={(event) => change('website', event.target.value)} placeholder="https://example.com" value={form.website} />
            </div>
          </Card>
          <div className="form-actions"><Button loading={saving} type="submit"><Save size={16} /> Save profile</Button></div>
        </form>
      ) : (
        <div className="profile-public-grid">
          <Card className="workspace-card"><h2>About</h2><p className="preserve-lines">{profile.biography || 'No biography has been added.'}</p><div className="skill-list">{profile.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div></Card>
          <Card className="workspace-card"><h2>Experience</h2>{profile.experience.length ? profile.experience.map((item) => <article className="profile-record" key={item._id}><strong>{item.title}</strong><span>{item.organization}</span><p>{item.description}</p></article>) : <p>No experience listed.</p>}</Card>
          <Card className="workspace-card"><h2>Education</h2>{profile.education.length ? profile.education.map((item) => <article className="profile-record" key={item._id}><strong>{item.degree}{item.field && ` · ${item.field}`}</strong><span>{item.institution}</span></article>) : <p>No education listed.</p>}</Card>
          <Card className="workspace-card"><h2>Certifications and projects</h2>{[...profile.certifications, ...profile.portfolio].map((item) => <article className="profile-record" key={item._id}><strong>{item.name || item.title}</strong><span>{item.issuer || item.branch}</span></article>)}</Card>
          <Card className="workspace-card"><h2>Links</h2><div className="profile-links">{Object.entries(profile.links).filter(([, value]) => value).map(([label, url]) => <a href={url} key={label} rel="noreferrer" target="_blank">{label}</a>)}</div></Card>
        </div>
      )}
    </div>
  );
}
