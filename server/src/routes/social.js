import { Router } from 'express';
import mongoose from 'mongoose';
import Answer from '../models/Answer.js';
import Bookmark from '../models/Bookmark.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import Question from '../models/Question.js';
import Report from '../models/Report.js';
import Resource from '../models/Resource.js';
import { requireAuth, requireEnabledFeature } from '../middleware/auth.js';
import { boundedText, httpError, pagination, paginatedResponse } from '../utils/http.js';

const router = Router();
router.use(requireAuth);
router.use('/notifications', requireEnabledFeature('notifications'));
const targetModels = { post: Post, question: Question, resource: Resource };
const reportModels = {
  post: Post,
  comment: Comment,
  question: Question,
  answer: Answer,
  resource: Resource,
};

async function findTarget(type, id, userId) {
  const Model = targetModels[type];
  if (!Model || !mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid bookmark target.');
  const filter = { _id: id };
  if (type !== 'resource') filter.status = { $nin: ['hidden', 'removed'] };
  else filter.status = 'approved';
  const target = await Model.findOne(filter);
  if (!target) throw httpError(404, 'The item is not available.');
  return { Model, target, userId };
}

router.get('/bookmarks', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = { user: req.user._id };
    if (['post', 'question', 'resource'].includes(req.query.type))
      filter.targetType = req.query.type;
    const [bookmarks, total] = await Promise.all([
      Bookmark.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Bookmark.countDocuments(filter),
    ]);
    const grouped = { post: [], question: [], resource: [] };
    await Promise.all(
      Object.entries(grouped).map(async ([type]) => {
        const selected = bookmarks.filter((bookmark) => bookmark.targetType === type);
        if (!selected.length) return;
        const Model = targetModels[type];
        grouped[type] = await Model.find({
          _id: { $in: selected.map((bookmark) => bookmark.target) },
          status: type === 'resource' ? 'approved' : { $nin: ['hidden', 'removed'] },
        }).populate(type === 'resource' ? 'uploader' : 'author', 'name userType branch');
      }),
    );
    return res.json({ bookmarks: grouped, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.post('/bookmarks/:type/:targetId', async (req, res, next) => {
  try {
    const { target } = await findTarget(req.params.type, req.params.targetId, req.user._id);
    const filter = { user: req.user._id, targetType: req.params.type, target: target._id };
    const exists = await Bookmark.exists(filter);
    if (exists) {
      await Bookmark.deleteOne(filter);
      return res.json({ bookmarked: false });
    }
    await Bookmark.create(filter);
    return res.json({ bookmarked: true, targetId: String(target._id) });
  } catch (error) {
    if (error.code === 11000) return res.json({ bookmarked: true });
    return next(error);
  }
});

router.get('/reports/mine', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const [reports, total] = await Promise.all([
      Report.find({ reporter: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('targetType reason details status createdAt'),
      Report.countDocuments({ reporter: req.user._id }),
    ]);
    return res.json({ reports, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.post('/reports', async (req, res, next) => {
  try {
    const { targetType, target, reason } = req.body || {};
    if (!reportModels[targetType] || !mongoose.isValidObjectId(target))
      throw httpError(400, 'Choose a valid item to report.');
    if (!['spam', 'harassment', 'copyright', 'unsafe', 'other'].includes(reason))
      throw httpError(400, 'Choose a valid report reason.');
    const Model = reportModels[targetType];
    if (!(await Model.exists({ _id: target })))
      throw httpError(404, 'The reported item was not found.');
    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      target,
      reason,
      details: boundedText(req.body.details, 1000, 'Report details'),
    });
    return res.status(201).json({ report: { id: report.id, status: report.status } });
  } catch (error) {
    if (error.code === 11000) return next(httpError(409, 'You have already reported this item.'));
    return next(error);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const [notifications, total, unread] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name'),
      Notification.countDocuments({ recipient: req.user._id }),
      Notification.countDocuments({ recipient: req.user._id, readAt: null }),
    ]);
    return res.json({ notifications, unread, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/notifications/:notificationId/read', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.notificationId))
      throw httpError(400, 'Invalid notification.');
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) throw httpError(404, 'Notification not found.');
    return res.json({ notification });
  } catch (error) {
    return next(error);
  }
});

router.patch('/notifications/read-all', async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.json({ updated: result.modifiedCount });
  } catch (error) {
    return next(error);
  }
});

export default router;
