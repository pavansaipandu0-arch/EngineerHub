import { Router } from 'express';
import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import { requireAuth, requireEnabledFeature } from '../middleware/auth.js';
import { imageUpload, validImageContent } from '../middleware/upload.js';
import { deleteStoredFile, signedImageUrl, uploadBuffer } from '../services/storage.js';
import { boundedText, httpError, pagination, paginatedResponse, validTags } from '../utils/http.js';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const router = Router();
router.use(requireAuth, requireEnabledFeature('community-hub'));

function postResponse(post, currentUserId) {
  const item = post.toObject();
  item.image = item.image?.publicId ? { url: signedImageUrl(item.image.publicId) } : { url: '' };
  item.likedByMe = post.likes.some((id) => String(id) === String(currentUserId));
  item.likeCount = post.likes.length;
  delete item.likes;
  return item;
}

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = { status: 'published' };
    if (req.query.branch && ENGINEERING_BRANCHES.includes(req.query.branch))
      filter.branch = req.query.branch;
    if (req.query.tag) filter.tags = String(req.query.tag).trim().toLowerCase().slice(0, 30);
    if (req.query.search) filter.$text = { $search: String(req.query.search).trim().slice(0, 150) };
    const sort = req.query.sort === 'popular' ? { likes: -1, createdAt: -1 } : { createdAt: -1 };
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('author', 'name userType branch'),
      Post.countDocuments(filter),
    ]);
    return res.json({
      posts: posts.map((post) => postResponse(post, req.user._id)),
      pagination: paginatedResponse(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:postId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) throw httpError(400, 'Invalid post.');
    const post = await Post.findOne({ _id: req.params.postId, status: 'published' }).populate(
      'author',
      'name userType branch',
    );
    if (!post) throw httpError(404, 'Post not found.');
    return res.json({ post: postResponse(post, req.user._id) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', imageUpload, async (req, res, next) => {
  let uploaded;
  let persisted = false;
  try {
    const body = boundedText(req.body?.body, 5000, 'Post text', { required: true });
    const branch = req.body?.branch || req.user.branch;
    if (!ENGINEERING_BRANCHES.includes(branch))
      throw httpError(400, 'Choose a valid engineering branch.');
    let tags = req.body?.tags;
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch {
        throw httpError(400, 'Tags must be a valid list.');
      }
    }
    if (req.file && !validImageContent(req.file))
      throw httpError(415, 'The image content does not match an allowed image type.');
    if (req.file) {
      uploaded = await uploadBuffer(req.file.buffer, {
        folder: 'posts',
        resourceType: 'image',
        format: req.file.mimetype.split('/')[1].replace('jpeg', 'jpg'),
        access: 'authenticated',
      });
    }
    const post = await Post.create({
      author: req.user._id,
      body,
      branch,
      tags: validTags(tags),
      image: uploaded ? { publicId: uploaded.public_id } : undefined,
    });
    persisted = true;
    await post.populate('author', 'name userType branch');
    return res.status(201).json({ post: postResponse(post, req.user._id) });
  } catch (error) {
    if (uploaded?.public_id && !persisted) {
      try {
        await deleteStoredFile(uploaded.public_id, 'image');
      } catch (cleanupError) {
        console.error('Post image cleanup failed:', cleanupError);
      }
    }
    return next(error);
  }
});

router.patch('/:postId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) throw httpError(400, 'Invalid post.');
    const post = await Post.findOne({
      _id: req.params.postId,
      author: req.user._id,
      status: 'published',
    });
    if (!post) throw httpError(404, 'Post not found.');
    if (req.body?.body !== undefined)
      post.body = boundedText(req.body.body, 5000, 'Post text', { required: true });
    if (req.body?.branch !== undefined) {
      if (!ENGINEERING_BRANCHES.includes(req.body.branch))
        throw httpError(400, 'Choose a valid engineering branch.');
      post.branch = req.body.branch;
    }
    if (req.body?.tags !== undefined) post.tags = validTags(req.body.tags);
    await post.save();
    await post.populate('author', 'name userType branch');
    return res.json({ post: postResponse(post, req.user._id) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:postId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) throw httpError(400, 'Invalid post.');
    const post = await Post.findOneAndUpdate(
      { _id: req.params.postId, author: req.user._id, status: 'published' },
      { $set: { status: 'removed' } },
      { new: true },
    );
    if (!post) throw httpError(404, 'Post not found.');
    await Comment.updateMany({ post: post._id }, { $set: { status: 'removed' } });
    if (post.image.publicId) {
      try {
        await deleteStoredFile(post.image.publicId, 'image');
      } catch (cleanupError) {
        console.error('Removed post image cleanup failed:', cleanupError);
      }
    }
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/:postId/image', imageUpload, async (req, res, next) => {
  let stored;
  let persisted = false;
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) throw httpError(400, 'Invalid post.');
    if (!req.file) throw httpError(400, 'Choose a JPEG, PNG, or WebP image.');
    if (!validImageContent(req.file))
      throw httpError(415, 'The image content does not match an allowed image type.');
    const post = await Post.findOne({
      _id: req.params.postId,
      author: req.user._id,
      status: 'published',
    });
    if (!post) throw httpError(404, 'Post not found.');
    stored = await uploadBuffer(req.file.buffer, {
      folder: 'posts',
      resourceType: 'image',
      format: req.file.mimetype.split('/')[1].replace('jpeg', 'jpg'),
      access: 'authenticated',
    });
    const previousId = post.image.publicId;
    post.image = { publicId: stored.public_id };
    await post.save();
    persisted = true;
    if (previousId) {
      try {
        await deleteStoredFile(previousId, 'image');
      } catch (cleanupError) {
        console.error('Previous post image cleanup failed:', cleanupError);
      }
    }
    return res.json({ post: postResponse(post, req.user._id) });
  } catch (error) {
    if (stored?.public_id && !persisted) {
      try {
        await deleteStoredFile(stored.public_id, 'image');
      } catch (cleanupError) {
        console.error('Post image cleanup failed:', cleanupError);
      }
    }
    return next(error);
  }
});

router.post('/:postId/like', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) throw httpError(400, 'Invalid post.');
    const post = await Post.findOne({ _id: req.params.postId, status: 'published' });
    if (!post) throw httpError(404, 'Post not found.');
    const alreadyLiked = post.likes.some((id) => String(id) === String(req.user._id));
    if (alreadyLiked) {
      await Post.updateOne({ _id: post._id }, { $pull: { likes: req.user._id } });
      return res.json({ liked: false, likeCount: Math.max(0, post.likes.length - 1) });
    }
    await Post.updateOne({ _id: post._id }, { $addToSet: { likes: req.user._id } });
    return res.json({ liked: true, likeCount: post.likes.length + 1 });
  } catch (error) {
    return next(error);
  }
});

router.get('/:postId/comments', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) throw httpError(400, 'Invalid post.');
    if (!(await Post.exists({ _id: req.params.postId, status: 'published' })))
      throw httpError(404, 'Post not found.');
    const { page, limit, skip } = pagination(req.query);
    const filter = { post: req.params.postId, status: 'published' };
    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name userType branch'),
      Comment.countDocuments(filter),
    ]);
    return res.json({ comments, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:postId/comments', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) throw httpError(400, 'Invalid post.');
    const post = await Post.findOne({ _id: req.params.postId, status: 'published' });
    if (!post) throw httpError(404, 'Post not found.');
    let parent = null;
    if (req.body?.parent) {
      if (!mongoose.isValidObjectId(req.body.parent))
        throw httpError(400, 'Invalid parent comment.');
      parent = await Comment.findOne({ _id: req.body.parent, post: post._id, status: 'published' });
      if (!parent) throw httpError(404, 'Parent comment not found.');
    }
    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      parent: parent?._id || null,
      body: boundedText(req.body?.body, 2000, 'Comment', { required: true }),
    });
    await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });
    await comment.populate('author', 'name userType branch');
    return res.status(201).json({ comment });
  } catch (error) {
    return next(error);
  }
});

router.delete('/comments/:commentId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) throw httpError(400, 'Invalid comment.');
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.commentId, author: req.user._id, status: 'published' },
      { $set: { status: 'removed' } },
      { new: true },
    );
    if (!comment) throw httpError(404, 'Comment not found.');
    await Post.updateOne(
      { _id: comment.post, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } },
    );
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
