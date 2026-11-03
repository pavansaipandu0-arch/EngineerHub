import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Bookmark, Download, FileText, Star, Upload } from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingSkeleton, Pagination, SearchBar, Select, Tabs, useToast } from '../components/ui.jsx';

const branches = [
  { value: '', label: 'All branches' },
  ...['aerospace', 'biomedical', 'chemical', 'civil', 'computer', 'electrical', 'environmental', 'industrial', 'materials', 'mechanical', 'other']
    .map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
];

export default function ResourcesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('library');
  const [resources, setResources] = useState([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '', branch: user.branch, tags: '', rightsConfirmed: false });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const notify = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = tab === 'mine'
        ? await api.get('/resources/mine', { params: { page, limit: 12 } })
        : await api.get('/resources', { params: { page, limit: 12, search, branch, sort } });
      setResources(data.resources);
      setPageCount(data.pagination.pageCount);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load knowledge resources.');
    } finally {
      setLoading(false);
    }
  }, [branch, page, search, sort, tab]);
  useEffect(() => { load(); }, [load]);

  async function submitUpload(event) {
    event.preventDefault();
    if (!file) {
      notify('Choose a document to upload.', 'error');
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      Object.entries(form).filter(([key]) => key !== 'tags').forEach(([key, value]) => data.append(key, String(value)));
      data.append('tags', JSON.stringify(form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)));
      data.append('file', file);
      await api.post('/resources', data);
      setForm({ title: '', description: '', category: '', branch: user.branch, tags: '', rightsConfirmed: false });
      setFile(null);
      setUploadOpen(false);
      setTab('mine');
      setPage(1);
      notify('Resource submitted for review.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to upload this resource.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function download(resource) {
    try {
      const { data } = await api.get(`/resources/${resource._id}/download`);
      window.location.assign(data.url);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to download resource.', 'error');
    }
  }

  async function preview(resource) {
    try {
      const { data } = await api.get(`/resources/${resource._id}/preview`);
      setSelected({ resource, previewUrl: data.url, reviews: [] });
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to preview this resource.', 'error');
    }
  }

  async function bookmark(resource) {
    try {
      const { data } = await api.post(`/bookmarks/resource/${resource._id}`);
      notify(data.bookmarked ? 'Resource saved.' : 'Resource removed from saved items.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to save resource.', 'error');
    }
  }

  async function openDetails(resource) {
    try {
      const { data } = await api.get(`/resources/${resource._id}`);
      setSelected({ resource: data.resource, previewUrl: '', reviews: data.reviews, myReview: data.myReview });
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to load resource details.', 'error');
    }
  }

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><div className="eyebrow">ENGINEERING KNOWLEDGE</div><h1>Knowledge library</h1><p>Discover and share engineering material with clear review and copyright controls.</p></div><Button onClick={() => setUploadOpen((value) => !value)}><Upload size={15} /> Upload resource</Button></header>
      <Tabs label="Library sections" onChange={(value) => { setTab(value); setPage(1); setSelected(null); }} tabs={[{ value: 'library', label: 'Approved library' }, { value: 'mine', label: 'My uploads' }]} value={tab} />
      {uploadOpen && <Card className="workspace-card"><form className="module-form" onSubmit={submitUpload}><div className="workspace-card-heading"><h2>Submit a resource</h2><p>PDF, DOCX, XLSX, PPTX, TXT, or CSV · maximum 20 MB · admin approval required.</p></div>
        <div className="form-grid"><Input label="Title" maxLength={180} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required value={form.title} /><Input label="Category" maxLength={80} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} placeholder="Course notes, reference..." required value={form.category} /><Select label="Engineering branch" onChange={(event) => setForm((value) => ({ ...value, branch: event.target.value }))} options={branches.filter((item) => item.value)} value={form.branch} /><Input label="Tags (comma separated)" onChange={(event) => setForm((value) => ({ ...value, tags: event.target.value }))} value={form.tags} />
          <label className="ui-field form-full"><span className="ui-field-label">Description</span><textarea className="ui-input ui-textarea" maxLength={3000} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} required rows={3} value={form.description} /></label>
          <label className="ui-field form-full"><span className="ui-field-label">Document</span><input accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv" onChange={(event) => setFile(event.target.files?.[0] || null)} required type="file" /></label>
        </div>
        <label className="rights-confirmation"><input checked={form.rightsConfirmed} onChange={(event) => setForm((value) => ({ ...value, rightsConfirmed: event.target.checked }))} required type="checkbox" /><span>I confirm that I own this material or have permission to share it.</span></label>
        <div className="form-actions"><Button loading={busy} type="submit">Submit for review</Button><Button onClick={() => setUploadOpen(false)} variant="secondary">Cancel</Button></div>
      </form></Card>}
      {tab === 'library' && <div className="filter-toolbar"><SearchBar label="Search resources" onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search title, description, or tags..." value={search} /><Select aria-label="Filter by branch" onChange={(event) => { setBranch(event.target.value); setPage(1); }} options={branches} value={branch} /><Select aria-label="Sort resources" onChange={(event) => { setSort(event.target.value); setPage(1); }} options={[{ value: 'latest', label: 'Latest' }, { value: 'popular', label: 'Top rated' }]} value={sort} /></div>}
      {error ? <ErrorState description={error} action={<Button onClick={load} variant="secondary">Try again</Button>} /> : loading ? <LoadingSkeleton className="skeleton-card" lines={5} /> : resources.length ? (
        <div className="resource-grid">{resources.map((resource) => <ResourceCard key={resource._id} onBookmark={() => bookmark(resource)} onDetails={() => openDetails(resource)} onDownload={() => download(resource)} onPreview={() => preview(resource)} resource={resource} showStatus={tab === 'mine'} />)}</div>
      ) : <EmptyState icon={BookOpen} title={tab === 'mine' ? 'No uploads yet' : 'No approved resources found'} description={tab === 'mine' ? 'Your submissions and review status will appear here.' : search || branch ? 'Try another search or filter.' : 'Approved engineering resources will appear here after review.'} />}
      <Pagination onPageChange={setPage} page={page} pageCount={pageCount} />
      {selected && <ResourceDetails data={selected} onClose={() => setSelected(null)} onDownload={() => download(selected.resource)} onReviewSaved={load} userId={user.id} />}
    </div>
  );
}

function ResourceCard({ resource, onDetails, onDownload, onBookmark, onPreview, showStatus }) {
  return <Card as="article" className="workspace-card resource-card"><div className="resource-card-top"><span className="resource-icon"><FileText size={18} /></span>{showStatus && <Badge tone={resource.status === 'approved' ? 'success' : resource.status === 'rejected' || resource.status === 'removed' ? 'error' : 'neutral'}>{resource.status.replace('_', ' ')}</Badge>}</div>
    <button className="resource-title-button" onClick={onDetails} type="button"><h2>{resource.title}</h2></button><p>{resource.description}</p>
    <div className="resource-meta"><span>{resource.branch} · {resource.category}</span><span>{resource.storage?.format?.toUpperCase()}</span></div>
    {resource.rating !== null && resource.rating !== undefined && <div className="resource-rating"><Star size={14} fill="currentColor" /> {resource.rating} <span>({resource.ratingCount} reviews)</span></div>}
    <div className="skill-list">{resource.tags.map((tag) => <span className="skill-chip" key={tag}>#{tag}</span>)}</div>
    <div className="resource-card-actions">{resource.status === 'approved' && <><Button onClick={onDownload} size="sm"><Download size={14} /> Download</Button>{resource.storage?.format === 'pdf' && <Button onClick={onPreview} size="sm" variant="secondary">Preview</Button>}<Button aria-label="Save resource" onClick={onBookmark} size="sm" variant="ghost"><Bookmark size={14} /></Button></>}</div>
  </Card>;
}

function ResourceDetails({ data, onClose, onDownload, onReviewSaved, userId }) {
  const { resource, previewUrl } = data;
  const [rating, setRating] = useState(data.myReview?.rating || 5);
  const [body, setBody] = useState(data.myReview?.body || '');
  const [busy, setBusy] = useState(false);
  const notify = useToast();
  async function saveReview(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.put(`/resources/${resource._id}/reviews`, { rating, body });
      await onReviewSaved();
      notify('Review saved.');
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to save review.', 'error');
    } finally {
      setBusy(false);
    }
  }
  return <div className="resource-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section aria-label={`Details for ${resource.title}`} aria-modal="true" className="resource-detail-panel" role="dialog">
      <header className="resource-detail-header"><div><div className="eyebrow">RESOURCE DETAILS</div><h2>{resource.title}</h2></div><Button aria-label="Close resource details" onClick={onClose} size="icon" variant="ghost">×</Button></header>
      <p>{resource.description}</p><div className="resource-meta"><span>{resource.branch} · {resource.category}</span><span>{resource.uploader?.name}</span></div>
      {previewUrl && <iframe className="resource-pdf-preview" src={previewUrl} title={`${resource.title} PDF preview`} />}
      {resource.downloadAvailable && <Button onClick={onDownload}><Download size={15} /> Download resource</Button>}
      {resource.status === 'approved' && <>
        {String(resource.uploader?._id) !== String(userId) && <>
        <form className="module-form review-form" onSubmit={saveReview}><h3>Your review</h3><Select label="Rating" onChange={(event) => setRating(Number(event.target.value))} options={[1, 2, 3, 4, 5].map((value) => ({ value, label: `${value} star${value === 1 ? '' : 's'}` }))} value={rating} /><label className="ui-field"><span className="ui-field-label">Review</span><textarea className="ui-input ui-textarea" maxLength={1500} onChange={(event) => setBody(event.target.value)} rows={3} value={body} /></label><Button loading={busy} type="submit">Save review</Button></form>
        </>}
        <div className="review-list"><h3>Reviews</h3>{data.reviews?.length ? data.reviews.map((review) => <article className="review-item" key={review._id}><strong>{review.author?.name} · {review.rating}/5</strong><p>{review.body}</p></article>) : <p>No reviews have been submitted.</p>}</div>
      </>}
    </section>
  </div>;
}
