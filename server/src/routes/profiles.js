import { Router } from 'express';
import mongoose from 'mongoose';
import Follow from '../models/Follow.js';
import Notification from '../models/Notification.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { imageUpload, validImageContent } from '../middleware/upload.js';
import { requireAuth, requireEnabledFeature } from '../middleware/auth.js';
import { deleteStoredFile, signedImageUrl, uploadBuffer } from '../services/storage.js';
import { boundedText, httpError, pagination, paginatedResponse, safeUrl } from '../utils/http.js';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const router = Router();
router.use(requireAuth, requireEnabledFeature('engineer-profiles'));

function completion(profile, user) {
  const checks = [
    Boolean(user.name),
    Boolean(profile.headline),
    Boolean(profile.biography),
    Boolean(profile.branch),
    Boolean(profile.organization),
    profile.skills.length > 0,
    profile.experience.length > 0,
    profile.education.length > 0,
    profile.certifications.length > 0,
    profile.portfolio.length > 0,
    Boolean(profile.photo.publicId),
    Boolean(profile.links.github || profile.links.linkedin || profile.links.website),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function profileView(profile, user, followers = 0, following = 0) {
  const photoUrl = profile.photo.publicId ? signedImageUrl(profile.photo.publicId) : '';
  return {
    ...profile.toObject(),
    photo: { url: photoUrl },
    user: { id: user.id, name: user.name, userType: user.userType, branch: user.branch },
    completion: completion(profile, user),
    followers,
    following,
  };
}

function dateValue(value, label) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw httpError(400, `${label} must be a valid date.`);
  return date;
}

function records(value, kind) {
  if (value === undefined) return undefined;
  const limits = { experience: 20, education: 20, certifications: 30, portfolio: 50 };
  if (!Array.isArray(value) || value.length > limits[kind]) {
    throw httpError(400, `Provide no more than ${limits[kind]} ${kind} records.`);
  }
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw httpError(400, `Each ${kind} record must be an object.`);
    if (kind === 'experience') {
      const startDate = dateValue(item.startDate, 'Experience start date');
      const endDate = dateValue(item.endDate, 'Experience end date');
      if (startDate && endDate && startDate > endDate)
        throw httpError(400, 'Experience end date must follow its start date.');
      return {
        title: boundedText(item.title, 120, 'Experience title', { required: true }),
        organization: boundedText(item.organization, 120, 'Experience organization', {
          required: true,
        }),
        description: boundedText(item.description, 1500, 'Experience description'),
        startDate,
        endDate,
        current: Boolean(item.current),
      };
    }
    if (kind === 'education') {
      const startDate = dateValue(item.startDate, 'Education start date');
      const endDate = dateValue(item.endDate, 'Education end date');
      if (startDate && endDate && startDate > endDate)
        throw httpError(400, 'Education end date must follow its start date.');
      return {
        institution: boundedText(item.institution, 120, 'Institution', { required: true }),
        degree: boundedText(item.degree, 120, 'Degree', { required: true }),
        field: boundedText(item.field, 120, 'Field'),
        startDate,
        endDate,
      };
    }
    if (kind === 'certifications') {
      return {
        name: boundedText(item.name, 160, 'Certification name', { required: true }),
        issuer: boundedText(item.issuer, 120, 'Certification issuer', { required: true }),
        issuedAt: dateValue(item.issuedAt, 'Certification date'),
        credentialUrl: safeUrl(item.credentialUrl, 'Credential URL'),
      };
    }
    if (item.branch && !ENGINEERING_BRANCHES.includes(item.branch))
      throw httpError(400, 'Choose a valid project branch.');
    return {
      title: boundedText(item.title, 120, 'Portfolio title', { required: true }),
      description: boundedText(item.description, 1500, 'Portfolio description'),
      url: safeUrl(item.url, 'Portfolio URL'),
      branch: item.branch || 'other',
    };
  });
}

router.get('/me', async (req, res, next) => {
  try {
    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $setOnInsert: { branch: req.user.branch, organization: req.user.organization } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const [followers, following] = await Promise.all([
      Follow.countDocuments({ targetType: 'user', target: req.user._id }),
      Follow.countDocuments({ follower: req.user._id, targetType: 'user' }),
    ]);
    return res.json({ profile: profileView(profile, req.user, followers, following) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const allowed = [
      'headline',
      'biography',
      'branch',
      'organization',
      'skills',
      'experience',
      'education',
      'certifications',
      'portfolio',
      'links',
      'visibility',
    ];
    if (Object.keys(body).some((key) => !allowed.includes(key))) {
      throw httpError(400, 'The profile contains an unsupported field.');
    }
    const profile =
      (await Profile.findOne({ user: req.user._id })) ||
      new Profile({
        user: req.user._id,
        branch: req.user.branch,
        organization: req.user.organization,
      });
    if (body.headline !== undefined) profile.headline = boundedText(body.headline, 160, 'Headline');
    if (body.biography !== undefined)
      profile.biography = boundedText(body.biography, 3000, 'Biography');
    if (body.branch !== undefined) {
      if (!ENGINEERING_BRANCHES.includes(body.branch))
        throw httpError(400, 'Choose a valid engineering branch.');
      profile.branch = body.branch;
    }
    if (body.organization !== undefined)
      profile.organization = boundedText(body.organization, 120, 'Organization');
    if (body.visibility !== undefined) {
      if (!['public', 'private'].includes(body.visibility))
        throw httpError(400, 'Choose a valid profile visibility.');
      profile.visibility = body.visibility;
    }
    if (body.skills !== undefined) {
      if (!Array.isArray(body.skills) || body.skills.length > 40)
        throw httpError(400, 'Provide no more than 40 skills.');
      profile.skills = [
        ...new Set(body.skills.map((skill) => boundedText(skill, 60, 'Skill')).filter(Boolean)),
      ];
    }
    for (const kind of ['experience', 'education', 'certifications', 'portfolio']) {
      const entries = records(body[kind], kind);
      if (entries !== undefined) profile[kind] = entries;
    }
    if (body.links !== undefined) {
      if (!body.links || typeof body.links !== 'object' || Array.isArray(body.links))
        throw httpError(400, 'Profile links must be an object.');
      if (Object.keys(body.links).some((key) => !['github', 'linkedin', 'website'].includes(key))) {
        throw httpError(400, 'The profile contains an unsupported link.');
      }
      for (const key of ['github', 'linkedin', 'website']) {
        if (body.links[key] !== undefined) profile.links[key] = safeUrl(body.links[key], key);
      }
    }
    await profile.save();
    return res.json({ profile: profileView(profile, req.user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/me/photo', imageUpload, async (req, res, next) => {
  let stored;
  let persisted = false;
  try {
    if (!req.file) throw httpError(400, 'Choose a JPEG, PNG, or WebP image.');
    if (!validImageContent(req.file))
      throw httpError(415, 'The image content does not match an allowed image type.');
    const profile = await Profile.findOne({ user: req.user._id });
    stored = await uploadBuffer(req.file.buffer, {
      folder: 'profiles',
      resourceType: 'image',
      format: req.file.mimetype.split('/')[1].replace('jpeg', 'jpg'),
      access: 'authenticated',
    });
    const previousId = profile?.photo?.publicId;
    const updated = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { branch: req.user.branch, 'photo.publicId': stored.public_id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    persisted = true;
    if (previousId) {
      try {
        await deleteStoredFile(previousId, 'image');
      } catch (cleanupError) {
        console.error('Previous profile image cleanup failed:', cleanupError);
      }
    }
    return res.json({ profile: profileView(updated, req.user) });
  } catch (error) {
    if (stored?.public_id && !persisted) {
      try {
        await deleteStoredFile(stored.public_id, 'image');
      } catch (cleanupError) {
        console.error('Profile image cleanup failed:', cleanupError);
      }
    }
    return next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = { visibility: 'public' };
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.search) {
      const escaped = String(req.query.search)
        .trim()
        .slice(0, 80)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escaped) {
        const users = await User.find({ name: new RegExp(escaped, 'i'), status: 'active' })
          .select('_id')
          .limit(100);
        filter.user = { $in: users.map((user) => user._id) };
      }
    }
    const [profiles, total] = await Promise.all([
      Profile.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name userType branch status'),
      Profile.countDocuments(filter),
    ]);
    const valid = profiles.filter((profile) => profile.user?.status === 'active');
    const profileIds = valid.map((profile) => profile.user._id);
    const follows = await Follow.find({
      follower: req.user._id,
      targetType: 'user',
      target: { $in: profileIds },
    }).select('target');
    const followedIds = new Set(follows.map((follow) => String(follow.target)));
    return res.json({
      profiles: valid.map((profile) => ({
        ...profileView(profile, profile.user),
        followedByMe: followedIds.has(String(profile.user._id)),
      })),
      pagination: paginatedResponse(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/users/:userId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) throw httpError(400, 'Invalid profile.');
    const user = await User.findOne({ _id: req.params.userId, status: 'active' }).select(
      'name userType branch organization',
    );
    if (!user) throw httpError(404, 'Profile not found.');
    const profile = await Profile.findOne({ user: user._id });
    if (
      !profile ||
      (profile.visibility === 'private' && String(user._id) !== String(req.user._id))
    ) {
      throw httpError(404, 'Profile not found.');
    }
    const [followers, following, existing] = await Promise.all([
      Follow.countDocuments({ targetType: 'user', target: user._id }),
      Follow.countDocuments({ follower: user._id, targetType: 'user' }),
      Follow.exists({ follower: req.user._id, targetType: 'user', target: user._id }),
    ]);
    return res.json({
      profile: {
        ...profileView(profile, user, followers, following),
        followedByMe: Boolean(existing),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:userId/follow', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) throw httpError(400, 'Invalid profile.');
    if (String(req.user._id) === req.params.userId)
      throw httpError(400, 'You cannot follow your own profile.');
    const target = await User.findOne({ _id: req.params.userId, status: 'active' }).select('_id');
    if (!target) throw httpError(404, 'Profile not found.');
    const filter = {
      follower: req.user._id,
      targetType: 'user',
      target: target._id,
      targetModel: 'User',
    };
    const existing = await Follow.exists(filter);
    if (existing) {
      await Follow.deleteOne(filter);
      await Notification.deleteOne({
        recipient: target._id,
        actor: req.user._id,
        type: 'follow',
        target: target._id,
      });
      return res.json({ following: false });
    }
    const visibleProfile = await Profile.exists({ user: target._id, visibility: 'public' });
    if (!visibleProfile) throw httpError(404, 'Profile not found.');
    await Follow.create(filter);
    await Notification.create({
      recipient: target._id,
      actor: req.user._id,
      type: 'follow',
      message: `${req.user.name} followed your profile.`,
      targetType: 'profile',
      target: target._id,
    });
    return res.json({ following: true });
  } catch (error) {
    if (error.code === 11000) return res.json({ following: true });
    return next(error);
  }
});

export default router;
