import { Router } from 'express';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import Resource from '../models/Resource.js';
import ResourceReview from '../models/ResourceReview.js';
import { requireAuth, requireEnabledFeature } from '../middleware/auth.js';
import { resourceUpload, validFileContent } from '../middleware/upload.js';
import { deleteStoredFile, signedResourceDownload, uploadBuffer } from '../services/storage.js';
import { boundedText, httpError, pagination, paginatedResponse, validTags } from '../utils/http.js';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const router = Router();
router.use(requireAuth, requireEnabledFeature('engineering-library'));
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Upload limit reached. Try again later.' },
});
const extensions = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = { status: 'approved' };
    if (req.query.branch && ENGINEERING_BRANCHES.includes(req.query.branch)) filter.branch = req.query.branch;
    if (req.query.category) filter.category = String(req.query.category).trim().slice(0, 80);
    if (req.query.tag) filter.tags = String(req.query.tag).trim().toLowerCase().slice(0, 30);
    if (req.query.search) filter.$text = { $search: String(req.query.search).trim().slice(0, 150) };
    const sort = req.query.sort === 'popular'
      ? { ratingCount: -1, ratingTotal: -1, createdAt: -1 }
      : { createdAt: -1 };
    const [resources, total] = await Promise.all([
      Resource.find(filter).sort(sort).skip(skip).limit(limit)
        .select('-storage.publicId -storage.originalName -storage.mimeType')
        .populate('uploader', 'name userType branch'),
      Resource.countDocuments(filter),
    ]);
    return res.json({
      resources: resources.map((resource) => ({
        ...resource.toObject(),
        rating: resource.ratingCount ? Math.round((resource.ratingTotal / resource.ratingCount) * 10) / 10 : null,
      })),
      pagination: paginatedResponse(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/mine', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const [resources, total] = await Promise.all([
      Resource.find({ uploader: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Resource.countDocuments({ uploader: req.user._id }),
    ]);
    return res.json({ resources, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', uploadLimiter, resourceUpload, async (req, res, next) => {
  let uploaded;
  try {
    const file = req.file;
    if (!file || !validFileContent(file)) throw httpError(415, 'The file content does not match an allowed document type.');
    if (req.body?.rightsConfirmed !== 'true') {
      throw httpError(400, 'Confirm that you have permission to share this material.');
    }
    const branch = req.body?.branch || req.user.branch;
    if (!ENGINEERING_BRANCHES.includes(branch)) throw httpError(400, 'Choose a valid engineering branch.');
    let tags;
    try {
      tags = req.body?.tags ? JSON.parse(req.body.tags) : [];
    } catch {
      throw httpError(400, 'Tags must be a valid JSON list.');
    }
    const ext = extensions[file.mimetype];
    uploaded = await uploadBuffer(file.buffer, {
      folder: 'library',
      resourceType: 'raw',
      format: ext,
      access: 'authenticated',
    });
    const resource = await Resource.create({
      uploader: req.user._id,
      title: boundedText(req.body?.title, 180, 'Resource title', { required: true }),
      description: boundedText(req.body?.description, 3000, 'Description', { required: true }),
      branch,
      category: boundedText(req.body?.category, 80, 'Category', { required: true }),
      tags: validTags(tags),
      storage: {
        provider: 'cloudinary',
        publicId: uploaded.public_id,
        resourceType: 'raw',
        format: ext,
        bytes: file.size,
        originalName: boundedText(file.originalname, 180, 'Filename'),
        mimeType: file.mimetype,
      },
      rightsConfirmedAt: new Date(),
    });
    return res.status(201).json({
      resource: {
        id: resource.id,
        title: resource.title,
        status: resource.status,
        createdAt: resource.createdAt,
      },
      message: 'Resource submitted for administrator review.',
    });
  } catch (error) {
    if (uploaded?.public_id) {
      try {
        await deleteStoredFile(uploaded.public_id, 'raw');
      } catch (cleanupError) {
        console.error('Resource upload cleanup failed:', cleanupError);
      }
    }
    return next(error);
  }
});

router.get('/:resourceId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.resourceId)) throw httpError(400, 'Invalid resource.');
    const resource = await Resource.findOne({
      _id: req.params.resourceId,
      $or: [
        { status: 'approved' },
        { uploader: req.user._id, status: { $in: ['pending', 'rejected'] } },
      ],
    }).populate('uploader', 'name userType branch');
    if (!resource) throw httpError(404, 'Resource not found.');
    const [reviews, myReview] = await Promise.all([
      ResourceReview.find({ resource: resource._id }).sort({ createdAt: -1 }).limit(20).populate('author', 'name'),
      ResourceReview.findOne({ resource: resource._id, author: req.user._id }),
    ]);
    const resourceView = resource.toObject();
    delete resourceView.storage.publicId;
    delete resourceView.storage.originalName;
    delete resourceView.storage.mimeType;
    return res.json({
      resource: {
        ...resourceView,
        downloadAvailable: resource.status === 'approved' || String(resource.uploader._id) === String(req.user._id),
        rating: resource.ratingCount ? Math.round((resource.ratingTotal / resource.ratingCount) * 10) / 10 : null,
      },
      reviews,
      myReview,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:resourceId/download', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.resourceId)) throw httpError(400, 'Invalid resource.');
    const resource = await Resource.findOne({
      _id: req.params.resourceId,
      $or: [
        { status: 'approved' },
        { uploader: req.user._id, status: { $in: ['pending', 'rejected'] } },
      ],
    }).select('+storage.publicId');
    if (!resource) throw httpError(404, 'Resource not found.');
    return res.json({
      url: signedResourceDownload(resource.storage.publicId, resource.storage.format, 'raw'),
      expiresIn: 300,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:resourceId/preview', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.resourceId)) throw httpError(400, 'Invalid resource.');
    const resource = await Resource.findOne({
      _id: req.params.resourceId,
      $or: [{ status: 'approved' }, { uploader: req.user._id, status: 'pending' }],
    }).select('storage');
    if (!resource) throw httpError(404, 'Resource not found.');
    if (resource.storage.format !== 'pdf') throw httpError(415, 'Preview is available for PDF resources only.');
    return res.json({
      url: signedResourceDownload(resource.storage.publicId, resource.storage.format, 'raw', false),
      expiresIn: 300,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:resourceId/reviews', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.resourceId)) throw httpError(400, 'Invalid resource.');
    if (!await Resource.exists({ _id: req.params.resourceId, status: 'approved' })) throw httpError(404, 'Resource not found.');
    const { page, limit, skip } = pagination(req.query);
    const filter = { resource: req.params.resourceId };
    const [reviews, total] = await Promise.all([
      ResourceReview.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'name'),
      ResourceReview.countDocuments(filter),
    ]);
    return res.json({ reviews, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:resourceId/reviews', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.resourceId)) throw httpError(400, 'Invalid resource.');
    const resource = await Resource.findOne({ _id: req.params.resourceId, status: 'approved' }).select('uploader');
    if (!resource) throw httpError(404, 'Resource not found.');
    if (String(resource.uploader) === String(req.user._id)) throw httpError(403, 'You cannot review your own resource.');
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError(400, 'Rating must be a whole number from 1 to 5.');
    const reviewBody = boundedText(req.body?.body, 1500, 'Review');
    const previous = await ResourceReview.findOne({ resource: resource._id, author: req.user._id });
    if (previous) {
      const oldRating = previous.rating;
      previous.rating = rating;
      previous.body = reviewBody;
      await previous.save();
      await Resource.updateOne({ _id: resource._id }, { $inc: { ratingTotal: rating - oldRating } });
      return res.json({ review: previous });
    }
    const review = await ResourceReview.create({
      resource: resource._id,
      author: req.user._id,
      rating,
      body: reviewBody,
    });
    await Resource.updateOne({ _id: resource._id }, { $inc: { ratingCount: 1, ratingTotal: rating } });
    return res.status(201).json({ review });
  } catch (error) {
    if (error.code === 11000) return next(httpError(409, 'You have already reviewed this resource.'));
    return next(error);
  }
});

export default router;
