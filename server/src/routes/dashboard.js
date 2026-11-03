import { Router } from 'express';
import Bookmark from '../models/Bookmark.js';
import Feature from '../models/Feature.js';
import Follow from '../models/Follow.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import Profile from '../models/Profile.js';
import Project from '../models/Project.js';
import ProjectTask from '../models/ProjectTask.js';
import Question from '../models/Question.js';
import Resource from '../models/Resource.js';
import User from '../models/User.js';
import { signedImageUrl } from '../services/storage.js';
import { requireAuth } from '../middleware/auth.js';
import { hasFeaturePermissions } from '../config/permissions.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const enabled = await Feature.find({
      enabled: true,
      implemented: true,
      maintenance: false,
    }).select('key name allowedRoles requiredPermissions');
    const roles = [req.user.role, req.user.userType];
    const available = enabled.filter(
      (feature) =>
        feature.allowedRoles.some((role) => roles.includes(role)) &&
        hasFeaturePermissions(req.user, feature.requiredPermissions),
    );
    const featureMap = Object.fromEntries(available.map(({ key, name }) => [key, name]));
    const [
      profile,
      projects,
      questions,
      recentPosts,
      trendingPosts,
      ownRecentPosts,
      resources,
      notifications,
      bookmarks,
      followed,
      taskCounts,
      user,
      postCount,
      questionCount,
      projectCount,
    ] = await Promise.all([
      Profile.findOne({ user: req.user._id }),
      featureMap['project-studio']
        ? Project.find({
            status: { $ne: 'archived' },
            $or: [
              { owner: req.user._id },
              { members: { $elemMatch: { user: req.user._id, status: 'active' } } },
            ],
          })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('owner', 'name')
        : [],
      featureMap['question-board']
        ? Question.find({ author: req.user._id, status: { $nin: ['hidden', 'removed'] } })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title branch status answersCount createdAt')
        : [],
      featureMap['community-hub']
        ? Post.find({ status: 'published' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('author', 'name branch')
        : [],
      featureMap['community-hub']
        ? Post.find({ status: 'published' })
            .sort({ likes: -1, createdAt: -1 })
            .limit(5)
            .populate('author', 'name branch')
        : [],
      featureMap['community-hub']
        ? Post.find({ author: req.user._id, status: 'published' }).sort({ createdAt: -1 }).limit(5)
        : [],
      featureMap['engineering-library']
        ? Resource.find({ status: 'approved', branch: req.user.branch })
            .sort({ ratingCount: -1, createdAt: -1 })
            .limit(5)
            .select('-storage.publicId -storage.originalName -storage.mimeType')
            .populate('uploader', 'name')
        : [],
      featureMap.notifications
        ? Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('actor', 'name')
        : [],
      Bookmark.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20),
      Follow.find({ follower: req.user._id, targetType: 'user' })
        .sort({ createdAt: -1 })
        .limit(12)
        .populate('target', 'name branch userType'),
      featureMap['project-studio']
        ? ProjectTask.aggregate([
            { $match: { assignee: req.user._id, status: { $ne: 'completed' } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
        : [],
      User.findById(req.user._id).select('name branch userType organization'),
      featureMap['community-hub']
        ? Post.countDocuments({ author: req.user._id, status: 'published' })
        : 0,
      featureMap['question-board']
        ? Question.countDocuments({ author: req.user._id, status: { $nin: ['hidden', 'removed'] } })
        : 0,
      featureMap['project-studio']
        ? Project.countDocuments({ owner: req.user._id, status: { $ne: 'archived' } })
        : 0,
    ]);

    const bookmarkIds = { post: [], question: [], resource: [] };
    for (const bookmark of bookmarks) bookmarkIds[bookmark.targetType]?.push(bookmark.target);
    const [savedPosts, savedQuestions, savedResources, tasksAssigned, unreadNotifications] =
      await Promise.all([
        bookmarkIds.post.length && featureMap['community-hub']
          ? Post.find({ _id: { $in: bookmarkIds.post }, status: 'published' }).populate(
              'author',
              'name',
            )
          : [],
        bookmarkIds.question.length && featureMap['question-board']
          ? Question.find({
              _id: { $in: bookmarkIds.question },
              status: { $nin: ['hidden', 'removed'] },
            })
          : [],
        bookmarkIds.resource.length && featureMap['engineering-library']
          ? Resource.find({ _id: { $in: bookmarkIds.resource }, status: 'approved' }).select(
              '-storage.publicId -storage.originalName -storage.mimeType',
            )
          : [],
        featureMap['project-studio']
          ? ProjectTask.countDocuments({ assignee: req.user._id, status: { $ne: 'completed' } })
          : 0,
        featureMap.notifications
          ? Notification.countDocuments({ recipient: req.user._id, readAt: null })
          : 0,
      ]);

    const activity = [];
    for (const post of ownRecentPosts) {
      activity.push({
        type: 'post',
        message: 'Published a community post.',
        createdAt: post.createdAt,
      });
    }
    for (const question of questions.slice(0, 3)) {
      activity.push({
        type: 'question',
        message: `Asked “${question.title}”.`,
        createdAt: question.createdAt,
      });
    }
    for (const project of projects.slice(0, 3)) {
      if (String(project.owner?._id || project.owner) === String(req.user._id)) {
        activity.push({
          type: 'project',
          message: `Created project ${project.name}.`,
          createdAt: project.createdAt,
        });
      }
    }
    activity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      user,
      profile: profile
        ? {
            headline: profile.headline,
            branch: profile.branch,
            organization: profile.organization,
            visibility: profile.visibility,
            photoUrl: profile.photo.publicId ? signedImageUrl(profile.photo.publicId) : '',
          }
        : null,
      modules: featureMap,
      projects,
      recentQuestions: questions,
      recentPosts,
      trendingPosts,
      recommendedResources: resources.map((resource) => ({
        ...resource.toObject(),
        rating: resource.ratingCount
          ? Math.round((resource.ratingTotal / resource.ratingCount) * 10) / 10
          : null,
      })),
      recommendations: {
        events: [],
        jobs: [],
      },
      saved: { posts: savedPosts, questions: savedQuestions, resources: savedResources },
      followedEngineers: followed.filter((item) => item.target).map((item) => item.target),
      notifications,
      unreadNotifications,
      activity: activity.slice(0, 8),
      summary: {
        posts: postCount,
        questions: questionCount,
        ownedProjects: projectCount,
        openTasksAssigned: tasksAssigned,
        unreadNotifications,
        taskStatuses: taskCounts,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
