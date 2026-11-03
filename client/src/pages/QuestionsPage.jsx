import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, CircleHelp, Flag, MessageSquareText, Plus, ThumbsDown, ThumbsUp } from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingSkeleton, Pagination, SearchBar, Select, useToast } from '../components/ui.jsx';

const branches = [
  { value: '', label: 'All branches' },
  ...['aerospace', 'biomedical', 'chemical', 'civil', 'computer', 'electrical', 'environmental', 'industrial', 'materials', 'mechanical', 'other']
    .map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
];

export default function QuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ pageCount: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [sort, setSort] = useState('latest');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', tags: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notify = useToast();

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/questions', { params: { page, limit: 12, search, branch, sort } });
      setQuestions(data.questions);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load questions.');
    } finally {
      setLoading(false);
    }
  }, [branch, page, search, sort]);
  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  async function submitQuestion(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/questions', {
        title: form.title,
        body: form.body,
        branch: user.branch,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      for (const file of files) {
        const upload = new FormData();
        upload.append('file', file);
        await api.post(`/questions/${data.question._id}/attachments`, upload);
      }
      setForm({ title: '', body: '', tags: '' });
      setFiles([]);
      setFormOpen(false);
      setPage(1);
      await loadQuestions();
      notify('Question published.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to publish the question.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><div className="eyebrow">ENGINEERING Q&amp;A</div><h1>Questions and answers</h1><p>Get practical, peer-reviewed guidance from engineers and students.</p></div><Button onClick={() => setFormOpen((value) => !value)}><Plus size={16} /> Ask a question</Button></header>
      {formOpen && <Card className="workspace-card"><form className="module-form" onSubmit={submitQuestion}>
        <Input label="Question title" maxLength={180} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required value={form.title} />
        <label className="ui-field"><span className="ui-field-label">Detailed question</span><textarea className="ui-input ui-textarea" maxLength={10000} onChange={(event) => setForm((value) => ({ ...value, body: event.target.value }))} required rows={6} value={form.body} /></label>
        <Input label="Tags (comma separated)" onChange={(event) => setForm((value) => ({ ...value, tags: event.target.value }))} value={form.tags} />
        <label className="ui-field"><span className="ui-field-label">Supporting documents (optional, max 20 MB each)</span><input accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv" multiple onChange={(event) => setFiles([...event.target.files].slice(0, 5))} type="file" /></label>
        {files.length > 0 && <p className="form-note">{files.map((file) => file.name).join(', ')}</p>}
        <div className="form-actions"><Button loading={busy} type="submit">Publish question</Button><Button onClick={() => setFormOpen(false)} variant="secondary">Cancel</Button></div>
      </form></Card>}
      <div className="filter-toolbar">
        <SearchBar label="Search questions" onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search title, details, or tags..." value={search} />
        <Select aria-label="Filter by branch" onChange={(event) => { setBranch(event.target.value); setPage(1); }} options={branches} value={branch} />
        <Select aria-label="Sort questions" onChange={(event) => { setSort(event.target.value); setPage(1); }} options={[{ value: 'latest', label: 'Latest' }, { value: 'popular', label: 'Most answered' }]} value={sort} />
      </div>
      {error ? <ErrorState description={error} action={<Button onClick={loadQuestions} variant="secondary">Try again</Button>} /> : loading ? <LoadingSkeleton className="skeleton-card" lines={5} /> : questions.length ? (
        <div className="record-list">{questions.map((question) => <QuestionCard key={question._id} question={question} />)}</div>
      ) : <EmptyState icon={CircleHelp} title="No questions found" description={search || branch ? 'Adjust your search or filters.' : 'Ask the first question for your engineering community.'} />}
      <Pagination onPageChange={setPage} page={page} pageCount={pagination.pageCount || 0} />
    </div>
  );
}

function QuestionCard({ question }) {
  const notify = useToast();
  async function bookmark() {
    try {
      const { data } = await api.post(`/bookmarks/question/${question._id}`);
      notify(data.bookmarked ? 'Question saved.' : 'Question removed from saved items.');
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to save question.', 'error');
    }
  }
  return (
    <Card className="workspace-card question-card">
      <div className="question-card-main">
        <div className="question-stats"><strong>{question.answersCount}</strong><span>answers</span></div>
        <div className="question-content">
          <div className="question-card-heading"><Link to={`/questions/${question._id}`}>{question.title}</Link><Badge tone={question.status === 'answered' ? 'success' : 'brand'}>{question.status}</Badge></div>
          <p>{question.body}</p>
          <div className="skill-list">{question.tags.map((tag) => <span className="skill-chip" key={tag}>#{tag}</span>)}</div>
          <div className="question-meta"><span>{question.author?.name}</span><span>{question.branch}</span><span>{new Date(question.createdAt).toLocaleDateString()}</span><Button onClick={bookmark} size="sm" variant="ghost"><Bookmark size={14} /> Save</Button></div>
        </div>
      </div>
    </Card>
  );
}

export function QuestionDetailPage() {
  const { questionId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [followed, setFollowed] = useState(false);
  const notify = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/questions/${questionId}`);
      setData(response.data);
      setFollowed(response.data.followedByMe);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load this question.');
    } finally {
      setLoading(false);
    }
  }, [questionId]);
  useEffect(() => { load(); }, [load]);

  async function submitAnswer(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/questions/${questionId}/answers`, { body });
      setBody('');
      await load();
      notify('Answer submitted.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to submit answer.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFollow() {
    try {
      const { data: response } = await api.post(`/questions/${questionId}/follow`);
      setFollowed(response.following);
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to follow this question.', 'error');
    }
  }

  if (loading) return <div className="workspace-page"><LoadingSkeleton className="skeleton-card" lines={5} /></div>;
  if (error || !data) return <div className="workspace-page"><ErrorState description={error || 'Question unavailable.'} action={<Button onClick={load} variant="secondary">Try again</Button>} /></div>;
  const { question, answers, related } = data;
  const isOwner = String(question.author?._id) === String(user.id);
  async function report(targetType, target) {
    try {
      await api.post('/reports', { targetType, target, reason: 'other', details: 'Please review this engineering content.' });
      notify('Report sent to the moderation team.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to send report.', 'error');
    }
  }

  async function vote(answer, value) {
    try {
      await api.post(`/questions/${questionId}/answers/${answer._id}/vote`, { value });
      await load();
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to record vote.', 'error');
    }
  }

  async function markBest(answer) {
    try {
      await api.post(`/questions/${questionId}/answers/${answer._id}/best`);
      await load();
      notify('Best answer selected.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to select best answer.', 'error');
    }
  }

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><div className="eyebrow">ENGINEERING Q&amp;A</div><h1>{question.title}</h1><p>Asked by {question.author?.name} · {question.branch} · {new Date(question.createdAt).toLocaleDateString()}</p></div><Button onClick={toggleFollow} variant={followed ? 'secondary' : 'primary'}>{followed ? 'Following' : 'Follow question'}</Button></header>
      <div className="question-detail-layout">
        <div className="question-main-column">
          <Card className="workspace-card"><div className="question-detail-meta"><Badge tone={question.status === 'answered' ? 'success' : 'brand'}>{question.status}</Badge><span>{question.views} views</span>{!isOwner && <Button onClick={() => report('question', question._id)} size="sm" variant="ghost"><Flag size={14} /> Report</Button>}</div><p className="preserve-lines question-detail-body">{question.body}</p><div className="skill-list">{question.tags.map((tag) => <span className="skill-chip" key={tag}>#{tag}</span>)}</div>
            {question.attachments.map((file) => <Attachment key={file._id} questionId={questionId} file={file} />)}
          </Card>
          <div className="section-heading question-answers-heading"><div><h2>Answers</h2><p>{answers.length} responses from the community</p></div></div>
          {answers.map((answer) => <AnswerCard answer={answer} currentUserId={user.id} isQuestionOwner={isOwner} isBest={String(question.bestAnswer?._id || question.bestAnswer) === answer._id} key={answer._id} onBest={() => markBest(answer)} onReport={() => report('answer', answer._id)} onVote={(value) => vote(answer, value)} onRefresh={load} questionId={questionId} />)}
          {question.status === 'open' && <Card className="workspace-card"><form className="module-form" onSubmit={submitAnswer}><label className="ui-field"><span className="ui-field-label">Your answer</span><textarea className="ui-input ui-textarea" maxLength={10000} onChange={(event) => setBody(event.target.value)} required rows={5} value={body} /></label><div className="form-actions"><Button loading={busy} type="submit">Submit answer</Button></div></form></Card>}
          {question.status !== 'open' && <p className="form-note">This question is no longer accepting answers.</p>}
        </div>
        <aside className="related-questions"><Card className="workspace-card"><h2>Related questions</h2>{related.length ? related.map((item) => <Link className="related-question-link" key={item._id} to={`/questions/${item._id}`}>{item.title}<small>{item.answersCount} answers</small></Link>) : <p>No related questions yet.</p>}</Card></aside>
      </div>
    </div>
  );
}

function Attachment({ questionId, file }) {
  const notify = useToast();
  async function download() {
    try {
      const { data } = await api.get(`/questions/${questionId}/attachments/${file._id}`);
      window.location.assign(data.url);
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to download attachment.', 'error');
    }
  }
  return <Button onClick={download} size="sm" variant="secondary">{file.fileName} · Download</Button>;
}

function AnswerCard({ answer, currentUserId, isQuestionOwner, isBest, onBest, onVote, onRefresh, questionId, onReport }) {
  const [comment, setComment] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const notify = useToast();
  const voteValue = answer.votes?.find((vote) => String(vote.user) === String(currentUserId))?.value || 0;
  const score = answer.votes?.reduce((sum, vote) => sum + vote.value, 0) || 0;
  async function addComment(event) {
    event.preventDefault();
    try {
      await api.post(`/questions/${questionId}/answers/${answer._id}/comments`, { body: comment });
      setComment('');
      await onRefresh();
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to add comment.', 'error');
    }
  }
  return (
    <Card className={`workspace-card answer-card ${isBest ? 'answer-best' : ''}`}>
      {isBest && <Badge tone="success">Accepted answer</Badge>}
      <div className="answer-body preserve-lines">{answer.body}</div>
      <div className="answer-footer"><span>Answered by <strong>{answer.author?.name}</strong></span><div className="answer-actions">
        <Button aria-label="Upvote" onClick={() => onVote(1)} size="sm" variant={voteValue === 1 ? 'primary' : 'secondary'}><ThumbsUp size={14} /> {score}</Button>
        <Button aria-label="Downvote" onClick={() => onVote(-1)} size="sm" variant={voteValue === -1 ? 'primary' : 'secondary'}><ThumbsDown size={14} /></Button>
        <Button onClick={() => setCommentsOpen((value) => !value)} size="sm" variant="ghost"><MessageSquareText size={14} /> {answer.comments.length} comments</Button>
        {!isQuestionOwner && <Button onClick={onReport} size="sm" variant="ghost"><Flag size={14} /> Report</Button>}
        {isQuestionOwner && !isBest && <Button onClick={onBest} size="sm" variant="secondary">Select best</Button>}
      </div></div>
      {commentsOpen && <div className="comment-thread">{answer.comments.map((item) => <div className="comment-row" key={item._id}><strong>{item.author?.name}</strong><span>{item.body}</span></div>)}<form className="inline-form" onSubmit={addComment}><Input aria-label="Add answer comment" onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." required value={comment} /><Button size="sm" type="submit">Comment</Button></form></div>}
    </Card>
  );
}
