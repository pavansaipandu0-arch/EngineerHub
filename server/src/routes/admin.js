import { Router } from 'express';
import mongoose from 'mongoose';
import Feature from '../models/Feature.js';
import FeatureAuditLog from '../models/FeatureAuditLog.js';
import Answer from '../models/Answer.js';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import Question from '../models/Question.js';
import Report from '../models/Report.js';
import Resource from '../models/Resource.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { PRODUCT_FEATURE_KEYS } from '../config/features.js';
import { signedResourceDownload } from '../services/storage.js';
import { pagination, paginatedResponse, httpError } from '../utils/http.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validateFeatureUpdates } from '../utils/featureConfig.js';

const router = Router();
router.use(requireAuth, requireAdmin);

async function persistFeatureChange(featureKey, updates, actor, action) {
  const session = await mongoose.startSession();
  let updatedFeature;
  try {
    await session.withTransaction(async () => {
      const feature = await Feature.findOne({ key: featureKey }).session(session);
      if (!feature) throw httpError(404, 'Module not found.');
      if (updates.enabled === true && !feature.implemented) {
        throw httpError(
          409,
          'This module cannot be enabled until its implementation is available.',
        );
      }
      const changedFields = Object.keys(updates).filter(
        (field) => JSON.stringify(feature[field]) !== JSON.stringify(updates[field]),
      );
      if (!changedFields.length && action !== 'emergency_disable') {
        throw httpError(400, 'The requested settings already have those values.');
      }
      const changes = changedFields.map((field) => ({
        field,
        previous: feature[field],
        current: updates[field],
      }));
      Object.assign(feature, updates);
      feature.updatedBy = actor;
      await feature.save({ session });
      await FeatureAuditLog.create([{ featureKey, actor, action, changes }], { session });
      updatedFeature = feature;
    });
    return updatedFeature.toObject();
  } finally {
    await session.endSession();
  }
}

router.get('/features', async (req, res, next) => {
  try {
    const features = await Feature.find({ key: { $in: PRODUCT_FEATURE_KEYS } })
      .populate('updatedBy', 'name')
      .sort({ category: 1, name: 1 })
      .lean();
    return res.json({ features });
  } catch (error) {
    return next(error);
  }
});

router.get('/features/history', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (
      typeof req.query.featureKey === 'string' &&
      PRODUCT_FEATURE_KEYS.includes(req.query.featureKey)
    ) {
      filter.featureKey = req.query.featureKey;
    }
    const [history, total] = await Promise.all([
      FeatureAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actor', 'name')
        .lean(),
      FeatureAuditLog.countDocuments(filter),
    ]);
    return res.json({
      history,
      pagination: { page, limit, total, pageCount: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/features/:key', async (req, res, next) => {
  try {
    if (!PRODUCT_FEATURE_KEYS.includes(req.params.key)) {
      return res.status(404).json({ message: 'Module not found.' });
    }
    const updates = validateFeatureUpdates(req.body);
    const feature = await persistFeatureChange(req.params.key, updates, req.user._id, 'updated');
    return res.json({ feature });
  } catch (error) {
    return next(error);
  }
});

router.post('/features/:key/emergency-disable', async (req, res, next) => {
  try {
    if (!PRODUCT_FEATURE_KEYS.includes(req.params.key)) throw httpError(404, 'Module not found.');
    const feature = await persistFeatureChange(
      req.params.key,
      { enabled: false, showWhenDisabled: false, maintenance: false },
      req.user._id,
      'emergency_disable',
    );
    return res.json({ feature });
  } catch (error) {
    return next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
    const filter = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { email: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name email role status emailVerifiedAt userType branch organization createdAt')
        .lean(),
      User.countDocuments(filter),
    ]);
    return res.json({
      users: users.map(({ emailVerifiedAt, ...user }) => ({
        ...user,
        emailVerified: Boolean(emailVerifiedAt),
      })),
      pagination: { page, limit, total, pageCount: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid account identifier.' });
    }
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Account status must be active or suspended.' });
    }
    if (req.params.id === req.user.id && status === 'suspended') {
      return res
        .status(400)
        .json({ message: 'You cannot suspend your own administrator account.' });
    }
    const user = await User.findById(req.params.id).select(
      'name email role status emailVerifiedAt',
    );
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    if (status === 'active' && !user.emailVerifiedAt) {
      return res
        .status(400)
        .json({ message: 'The account must verify its email before it can be activated.' });
    }
    user.status = status;
    await user.save();
    if (status === 'suspended') await Session.deleteMany({ userId: user._id });
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/resources', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const status = ['pending', 'approved', 'rejected', 'removed'].includes(req.query.status)
      ? req.query.status
      : 'pending';
    const filter = { status };
    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('uploader', 'name email')
        .populate('approvedBy', 'name'),
      Resource.countDocuments(filter),
    ]);
    return res.json({ resources, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.get('/resources/:id/download', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid resource.');
    const resource = await Resource.findById(req.params.id).select('storage');
    if (!resource) throw httpError(404, 'Resource not found.');
    return res.json({
      url: signedResourceDownload(resource.storage.publicId, resource.storage.format, 'raw'),
      expiresIn: 300,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/resources/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid resource.');
    const { status } = req.body || {};
    if (!['approved', 'rejected', 'removed'].includes(status)) {
      throw httpError(400, 'Choose an allowed moderation status.');
    }
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['pending', 'approved'] } },
      { $set: { status, approvedBy: status === 'approved' ? req.user._id : null } },
      { new: true },
    );
    if (!resource) throw httpError(404, 'Resource not found.');
    const Notification = (await import('../models/Notification.js')).default;
    await Notification.create({
      recipient: resource.uploader,
      actor: req.user._id,
      type: status === 'approved' ? 'resource_approved' : 'system',
      message: `Your resource "${resource.title}" was ${status}.`,
      targetType: 'resource',
      target: resource._id,
    });
    return res.json({ resource: { id: resource.id, status: resource.status } });
  } catch (error) {
    return next(error);
  }
});

router.get('/reports', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const status = ['pending', 'reviewed', 'dismissed', 'actioned'].includes(req.query.status)
      ? req.query.status
      : 'pending';
    const [reports, total] = await Promise.all([
      Report.find({ status })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('reporter', 'name email'),
      Report.countDocuments({ status }),
    ]);
    return res.json({ reports, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/reports/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid report.');
    const { status } = req.body || {};
    if (!['reviewed', 'dismissed', 'actioned'].includes(status))
      throw httpError(400, 'Choose an allowed review status.');
    const report = await Report.findById(req.params.id);
    if (!report) throw httpError(404, 'Report not found.');
    if (status === 'actioned') {
      const targetModels = {
        post: Post,
        comment: Comment,
        question: Question,
        answer: Answer,
        resource: Resource,
      };
      const Model = targetModels[report.targetType];
      const nextStatus = report.targetType === 'resource' ? 'removed' : 'hidden';
      const result = await Model.updateOne(
        { _id: report.target },
        { $set: { status: nextStatus } },
      );
      if (!result.matchedCount) throw httpError(404, 'Reported content no longer exists.');
    }
    report.status = status;
    await report.save();
    return res.json({ report: { id: report.id, status: report.status } });
  } catch (error) {
    return next(error);
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default router;
