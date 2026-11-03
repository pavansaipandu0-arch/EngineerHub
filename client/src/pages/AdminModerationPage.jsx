import { useCallback, useEffect, useState } from 'react';
import { Flag, ShieldCheck } from 'lucide-react';
import api from '../api.js';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSkeleton, Select, useToast } from '../components/ui.jsx';

export default function AdminModerationPage() {
  const [reports, setReports] = useState([]);
  const [resources, setResources] = useState([]);
  const [reportStatus, setReportStatus] = useState('pending');
  const [resourceStatus, setResourceStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notify = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportResponse, resourceResponse] = await Promise.all([
        api.get('/admin/reports', { params: { status: reportStatus, limit: 30 } }),
        api.get('/admin/resources', { params: { status: resourceStatus, limit: 30 } }),
      ]);
      setReports(reportResponse.data.reports);
      setResources(resourceResponse.data.resources);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load moderation queues.');
    } finally {
      setLoading(false);
    }
  }, [reportStatus, resourceStatus]);
  useEffect(() => { load(); }, [load]);

  async function reviewReport(report, status) {
    try {
      await api.patch(`/admin/reports/${report._id}`, { status });
      await load();
      notify(status === 'actioned' ? 'Report actioned and content hidden.' : `Report marked ${status}.`);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update report.', 'error');
    }
  }

  async function reviewResource(resource, status) {
    try {
      await api.patch(`/admin/resources/${resource._id}`, { status });
      await load();
      notify(`Resource ${status}.`);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update resource.', 'error');
    }
  }

  async function downloadResource(resource) {
    try {
      const { data } = await api.get(`/admin/resources/${resource._id}/download`);
      window.location.assign(data.url);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to open the submitted document.', 'error');
    }
  }

  return <div className="workspace-page"><header className="page-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1>Content moderation</h1><p>Review member reports and library submissions.</p></div><Badge tone="brand"><ShieldCheck size={14} /> Administrator</Badge></header>
    {error ? <ErrorState description={error} action={<Button onClick={load} variant="secondary">Try again</Button>} /> : loading ? <LoadingSkeleton className="skeleton-card" lines={6} /> : <>
      <Card className="workspace-card moderation-panel"><div className="workspace-card-heading"><div><h2><Flag size={17} /> Member reports</h2><p>Reports can be dismissed, reviewed, or actioned to hide content.</p></div><Select aria-label="Report status filter" onChange={(event) => setReportStatus(event.target.value)} options={['pending', 'reviewed', 'dismissed', 'actioned'].map((value) => ({ value, label: value }))} value={reportStatus} /></div>
        {reports.length ? <div className="moderation-list">{reports.map((report) => <article className="moderation-row" key={report._id}><div><strong>{report.targetType} report · {report.reason}</strong><p>{report.details || 'No additional details.'}</p><small>Reporter: {report.reporter?.name} · Target: {report.target} · {new Date(report.createdAt).toLocaleString()}</small></div><div className="inline-form"><Button disabled={report.status !== 'pending'} onClick={() => reviewReport(report, 'dismissed')} size="sm" variant="secondary">Dismiss</Button><Button disabled={report.status !== 'pending'} onClick={() => reviewReport(report, 'reviewed')} size="sm" variant="secondary">Review</Button><Button disabled={report.status !== 'pending'} onClick={() => reviewReport(report, 'actioned')} size="sm" variant="danger">Hide content</Button></div></article>)}</div> : <EmptyState icon={Flag} title="No reports in this queue" description="Member reports matching this status will appear here." />}
      </Card>
      <Card className="workspace-card moderation-panel"><div className="workspace-card-heading"><div><h2><ShieldCheck size={17} /> Resource approval</h2><p>Only approved resources are listed in the public knowledge library.</p></div><Select aria-label="Resource status filter" onChange={(event) => setResourceStatus(event.target.value)} options={['pending', 'approved', 'rejected', 'removed'].map((value) => ({ value, label: value }))} value={resourceStatus} /></div>
        {resources.length ? <div className="moderation-list">{resources.map((resource) => <article className="moderation-row" key={resource._id}><div><strong>{resource.title}</strong><p>{resource.description}</p><small>{resource.branch} · {resource.category} · {resource.storage?.originalName} · Submitted by {resource.uploader?.name}</small><Badge tone={resource.status === 'approved' ? 'success' : 'neutral'}>{resource.status}</Badge></div><div className="inline-form"><Button onClick={() => downloadResource(resource)} size="sm" variant="secondary">Review file</Button>{resource.status === 'pending' && <><Button onClick={() => reviewResource(resource, 'approved')} size="sm">Approve</Button><Button onClick={() => reviewResource(resource, 'rejected')} size="sm" variant="danger">Reject</Button></>}</div></article>)}</div> : <EmptyState icon={ShieldCheck} title="No resources in this queue" description="Submissions matching this status will appear here." />}
      </Card>
    </>}
  </div>;
}
