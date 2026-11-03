import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bookmark, Heart, MessageCircle, Share2, Trash2, Upload, Flag, Send } from 'lucide-react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingSkeleton, Pagination, SearchBar, Select, useToast } from '../components/ui.jsx';

const branches = [
  { value: '', label: 'All branches' },
  ...['aerospace', 'biomedical', 'chemical', 'civil', 'computer', 'electrical', 'environmental', 'industrial', 'materials', 'mechanical', 'other']
    .map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
];
const reportOptions = [
  { value: 'spam', label: 'Spam' }, { value: 'harassment', label: 'Harassment' },
  { value: 'copyright', label: 'Copyright concern' }, { value: 'unsafe', label: 'Unsafe content' },
  { value: 'other', label: 'Other' },
];

export default function CommunityPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [sharedPost, setSharedPost] = useState(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const notify = useToast();

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/community', { params: { page, limit: 10, search, branch, sort } });
      setPosts(data.posts);
      setPageCount(data.pagination.pageCount);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load the community feed.');
    } finally {
      setLoading(false);
    }
  }, [branch, page, search, sort]);

  useEffect(() => { loadPosts(); }, [loadPosts]);
  useEffect(() => {
    const postId = new URLSearchParams(location.search).get('post');
    if (!postId) {
      setSharedPost(null);
      return;
    }
    let active = true;
    api.get(`/community/${postId}`)
      .then(({ data }) => { if (active) setSharedPost(data.post); })
      .catch((requestError) => { if (active) notify(requestError.response?.data?.message || 'Shared post is unavailable.', 'error'); });
    return () => { active = false; };
  }, [location.search, notify]);

  async function createPost(event) {
    event.preventDefault();
    setPosting(true);
    try {
      const payload = image ? new FormData() : {
        body,
        branch: user.branch,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      };
      if (image) {
        payload.append('body', body);
        payload.append('branch', user.branch);
        payload.append('tags', JSON.stringify(tags.split(',').map((tag) => tag.trim()).filter(Boolean)));
        payload.append('file', image);
      }
      await api.post('/community', payload);
      setBody('');
      setTags('');
      setImage(null);
      setPage(1);
      await loadPosts();
      notify('Post published.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to publish post.', 'error');
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(post) {
    try {
      const { data } = await api.post(`/community/${post._id}/like`);
      setPosts((current) => current.map((item) => item._id === post._id
        ? { ...item, likedByMe: data.liked, likeCount: data.likeCount }
        : item));
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to update like.', 'error');
    }
  }

  async function toggleBookmark(post) {
    try {
      const { data } = await api.post(`/bookmarks/post/${post._id}`);
      notify(data.bookmarked ? 'Post saved.' : 'Post removed from saved items.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to save this post.', 'error');
    }
  }

  async function deletePost(post) {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await api.delete(`/community/${post._id}`);
      setPosts((current) => current.filter((item) => item._id !== post._id));
      notify('Post deleted.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to delete post.', 'error');
    }
  }

  async function reportPost(postId, reason, details) {
    try {
      await api.post('/reports', { targetType: 'post', target: postId, reason, details });
      notify('Report sent to the moderation team.');
    } catch (requestError) {
      notify(requestError.response?.data?.message || 'Unable to send report.', 'error');
    }
  }

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="workspace-page">
      <header className="page-heading"><div><div className="eyebrow">ENGINEERING COMMUNITY</div><h1>Community hub</h1><p>Share work, exchange ideas, and learn from engineers across disciplines.</p></div></header>
      <Card className="workspace-card">
        <form className="composer" onSubmit={createPost}>
          <label className="ui-field"><span className="ui-field-label">Share an engineering update</span><textarea className="ui-input ui-textarea" maxLength={5000} onChange={(event) => setBody(event.target.value)} placeholder="What are you building, learning, or exploring?" required rows={4} value={body} /></label>
          <div className="composer-controls"><Input aria-label="Tags, comma separated" onChange={(event) => setTags(event.target.value)} placeholder="Tags, comma separated" value={tags} />
            <label className="upload-control"><Upload size={15} />{image ? image.name : 'Add image'}<input accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} type="file" /></label>
            <Button loading={posting} type="submit"><Send size={15} /> Publish</Button>
          </div>
          <small className="form-note">Your post is categorized under {user.branch} engineering.</small>
        </form>
      </Card>

      <div className="filter-toolbar">
        <SearchBar label="Search community posts" onChange={(value) => changeFilter(setSearch, value)} placeholder="Search posts or tags..." value={search} />
        <Select aria-label="Filter by engineering branch" onChange={(event) => changeFilter(setBranch, event.target.value)} options={branches} value={branch} />
        <Select aria-label="Sort posts" onChange={(event) => changeFilter(setSort, event.target.value)} options={[{ value: 'latest', label: 'Latest' }, { value: 'popular', label: 'Most popular' }]} value={sort} />
      </div>

      {error ? <ErrorState description={error} action={<Button onClick={loadPosts} variant="secondary">Try again</Button>} /> : loading ? <LoadingSkeleton className="skeleton-card" lines={5} /> : posts.length ? (
        <div className="record-list">
          {sharedPost && !posts.some((post) => post._id === sharedPost._id) && <CommunityPost
            onBookmark={() => toggleBookmark(sharedPost)}
            onDelete={() => deletePost(sharedPost)}
            onLike={() => toggleLike(sharedPost)}
            onReport={(reason, details) => reportPost(sharedPost._id, reason, details)}
            post={sharedPost}
            userId={user.id}
          />}
          {posts.map((post) => <CommunityPost
            key={post._id}
            onBookmark={() => toggleBookmark(post)}
            onDelete={() => deletePost(post)}
            onLike={() => toggleLike(post)}
            onReport={(reason, details) => reportPost(post._id, reason, details)}
            post={post}
            userId={user.id}
          />)}
        </div>
      ) : sharedPost ? (
        <div className="record-list"><CommunityPost
          onBookmark={() => toggleBookmark(sharedPost)}
          onDelete={() => deletePost(sharedPost)}
          onLike={() => toggleLike(sharedPost)}
          onReport={(reason, details) => reportPost(sharedPost._id, reason, details)}
          post={sharedPost}
          userId={user.id}
        /></div>
      ) : <EmptyState icon={MessageCircle} title="No community posts yet" description={search || branch ? 'Try adjusting your search or filters.' : 'Be the first to share an engineering update.'} />}
      <Pagination onPageChange={setPage} page={page} pageCount={pageCount} />
    </div>
  );
}

function CommunityPost({ post, userId, onLike, onBookmark, onDelete, onReport }) {
  const [comments, setComments] = useState(null);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [savedBody, setSavedBody] = useState(post.body);
  const [submitting, setSubmitting] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reporting, setReporting] = useState(false);
  const notify = useToast();
  const author = post.author || {};
  const ownPost = String(author._id) === String(userId);

  async function loadComments() {
    if (comments) {
      setComments(null);
      return;
    }
    try {
      const { data } = await api.get(`/community/${post._id}/comments`, { params: { limit: 50 } });
      setComments(data.comments);
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to load comments.', 'error');
    }
  }

  async function addComment(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post(`/community/${post._id}/comments`, { body: comment, parent: replyTo?._id });
      setComments((current) => [...(current || []), data.comment]);
      setComment('');
      setReplyTo(null);
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to add comment.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function sharePost() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community?post=${post._id}`);
      notify('Share link copied.');
    } catch {
      notify('Clipboard access is unavailable in this browser.', 'error');
    }
  }

  async function submitReport() {
    await onReport(reportReason, '');
    setReporting(false);
  }

  async function saveEdit(event) {
    event.preventDefault();
    try {
      const { data } = await api.patch(`/community/${post._id}`, { body: editBody });
      setSavedBody(data.post.body);
      setEditing(false);
      notify('Post updated.');
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to update post.', 'error');
    }
  }

  async function deleteComment(item) {
    try {
      await api.delete(`/community/comments/${item._id}`);
      setComments((current) => current.filter((commentItem) => commentItem._id !== item._id));
      notify('Comment deleted.');
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to delete comment.', 'error');
    }
  }

  return (
    <Card className="workspace-card post-card">
      <div className="post-author">
        <span className="user-avatar">{author.name?.charAt(0)?.toUpperCase() || 'E'}</span>
        <div><strong>{author.name || 'EngineerHub member'}</strong><small>{author.branch || post.branch} · {new Date(post.createdAt).toLocaleDateString()}</small></div>
        <Badge>{post.branch}</Badge>
      </div>
      {editing ? <form className="module-form" onSubmit={saveEdit}><label className="ui-field"><span className="ui-field-label">Edit post</span><textarea className="ui-input ui-textarea" maxLength={5000} onChange={(event) => setEditBody(event.target.value)} required rows={4} value={editBody} /></label><div className="inline-form"><Button size="sm" type="submit">Save changes</Button><Button onClick={() => { setEditing(false); setEditBody(savedBody); }} size="sm" variant="secondary">Cancel</Button></div></form> : <p className="post-body preserve-lines">{savedBody}</p>}
      {post.image?.url && <img alt="Post attachment" className="post-image" loading="lazy" src={post.image.url} />}
      <div className="skill-list">{post.tags.map((tag) => <span className="skill-chip" key={tag}>#{tag}</span>)}</div>
      <div className="post-actions">
        <Button onClick={onLike} size="sm" variant={post.likedByMe ? 'primary' : 'secondary'}><Heart size={15} /> {post.likeCount}</Button>
        <Button onClick={loadComments} size="sm" variant="secondary"><MessageCircle size={15} /> {comments?.length ?? post.commentsCount} comments</Button>
        <Button onClick={onBookmark} size="sm" variant="ghost"><Bookmark size={15} /> Save</Button>
        <Button onClick={sharePost} size="sm" variant="ghost"><Share2 size={15} /> Share</Button>
        {ownPost ? <><Button onClick={() => setEditing((value) => !value)} size="sm" variant="ghost">Edit</Button><Button aria-label="Delete post" onClick={onDelete} size="sm" variant="ghost"><Trash2 size={15} /></Button></> : <Button onClick={() => setReporting((value) => !value)} size="sm" variant="ghost"><Flag size={15} /> Report</Button>}
      </div>
      {reporting && <div className="inline-form"><Select aria-label="Report reason" onChange={(event) => setReportReason(event.target.value)} options={reportOptions} value={reportReason} /><Button onClick={submitReport} size="sm">Submit report</Button></div>}
      {comments && <div className="comment-thread">{comments.map((item) => <div className={`comment-row ${item.parent ? 'comment-reply' : ''}`} key={item._id}><strong>{item.author?.name}</strong><span>{item.body}</span><div className="comment-actions"><Button onClick={() => { setReplyTo(item); setComment(''); }} size="sm" variant="ghost">Reply</Button>{String(item.author?._id) === String(userId) && <Button onClick={() => deleteComment(item)} size="sm" variant="ghost">Delete</Button>}</div></div>)}
        {replyTo && <p className="replying-to">Replying to {replyTo.author?.name} <Button onClick={() => setReplyTo(null)} size="sm" variant="ghost">Cancel</Button></p>}
        <form className="inline-form" onSubmit={addComment}><Input aria-label={replyTo ? 'Write a reply' : 'Write a comment'} maxLength={2000} onChange={(event) => setComment(event.target.value)} placeholder={replyTo ? `Reply to ${replyTo.author?.name}...` : 'Write a comment...'} required value={comment} /><Button loading={submitting} size="sm" type="submit">{replyTo ? 'Reply' : 'Comment'}</Button></form>
      </div>}
    </Card>
  );
}
