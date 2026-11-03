import { Router } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import Project from '../models/Project.js';
import ProjectActivity from '../models/ProjectActivity.js';
import ProjectComment from '../models/ProjectComment.js';
import ProjectTask from '../models/ProjectTask.js';
import User from '../models/User.js';
import { requireAuth, requireEnabledFeature } from '../middleware/auth.js';
import { resourceUpload, validFileContent } from '../middleware/upload.js';
import { deleteStoredFile, signedResourceDownload, uploadBuffer } from '../services/storage.js';
import { boundedText, httpError, pagination, paginatedResponse } from '../utils/http.js';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const router = Router();
router.use(requireAuth, requireEnabledFeature('project-studio'));

function activeMember(project, userId) {
  return project.members.find(
    (member) =>
      String(member.user?._id || member.user) === String(userId) && member.status === 'active',
  );
}

function canEdit(project, userId) {
  return ['owner', 'editor'].includes(activeMember(project, userId)?.role);
}

async function writeActivity(project, actor, action, detail = '') {
  await ProjectActivity.create({ project, actor, action, detail });
}

async function getVisibleProject(id, userId) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid project.');
  const project = await Project.findOne({
    _id: id,
    status: { $ne: 'archived' },
    $or: [
      { visibility: 'public' },
      { members: { $elemMatch: { user: userId, status: { $in: ['active', 'invited'] } } } },
    ],
  })
    .populate('owner', 'name userType branch')
    .populate('members.user', 'name userType branch');
  if (!project) throw httpError(404, 'Project not found.');
  return project;
}

router.get('/', async (req, res, next) => {
  try {
    const filter = {
      status: { $ne: 'archived' },
      $or: [
        { owner: req.user._id },
        { members: { $elemMatch: { user: req.user._id, status: 'active' } } },
      ],
    };
    if (req.query.status && ['active', 'completed'].includes(req.query.status))
      filter.status = req.query.status;
    const { page, limit, skip } = pagination(req.query);
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name userType branch'),
      Project.countDocuments(filter),
    ]);
    const ids = projects.map((project) => project._id);
    const [stats, tasks] = await Promise.all([
      ProjectTask.aggregate([
        { $match: { project: { $in: ids } } },
        {
          $group: {
            _id: '$project',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          },
        },
      ]),
      ProjectTask.find({
        project: { $in: ids },
        assignee: req.user._id,
        status: { $ne: 'completed' },
      })
        .sort({ dueDate: 1 })
        .limit(10)
        .populate('project', 'name'),
    ]);
    const progress = new Map(stats.map((item) => [String(item._id), item]));
    return res.json({
      projects: projects.map((project) => {
        const stat = progress.get(String(project._id)) || { total: 0, completed: 0 };
        return {
          ...project.toObject(),
          taskCount: stat.total,
          completedTasks: stat.completed,
          progress: stat.total ? Math.round((stat.completed / stat.total) * 100) : 0,
        };
      }),
      myTasks: tasks,
      pagination: paginatedResponse(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const branch = req.body?.branch || req.user.branch;
    if (!ENGINEERING_BRANCHES.includes(branch))
      throw httpError(400, 'Choose a valid engineering branch.');
    const project = await Project.create({
      owner: req.user._id,
      name: boundedText(req.body?.name, 120, 'Project name', { required: true }),
      description: boundedText(req.body?.description, 5000, 'Project description', {
        required: true,
      }),
      category: boundedText(req.body?.category, 80, 'Project category', { required: true }),
      branch,
      startDate: req.body?.startDate || undefined,
      endDate: req.body?.endDate || undefined,
      visibility: ['private', 'members', 'public'].includes(req.body?.visibility)
        ? req.body.visibility
        : 'private',
      members: [{ user: req.user._id, role: 'owner', status: 'active' }],
    });
    await writeActivity(project._id, req.user._id, 'created', `Created project ${project.name}.`);
    await project.populate('owner', 'name userType branch');
    return res.status(201).json({ project });
  } catch (error) {
    return next(error);
  }
});

router.get('/invitations', async (req, res, next) => {
  try {
    const projects = await Project.find({
      members: { $elemMatch: { user: req.user._id, status: 'invited' } },
      status: { $ne: 'archived' },
    })
      .select('name description branch owner members.createdAt')
      .populate('owner', 'name');
    return res.json({
      invitations: projects.map((project) => ({
        projectId: project.id,
        name: project.name,
        description: project.description,
        branch: project.branch,
        owner: project.owner,
        invitedAt: project.members.find((member) => String(member.user) === String(req.user._id))
          ?.invitedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/invitations/:projectId/respond', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.projectId))
      throw httpError(400, 'Invalid invitation.');
    if (!['accept', 'reject'].includes(req.body?.response))
      throw httpError(400, 'Choose accept or reject.');
    const project = await Project.findOne({
      _id: req.params.projectId,
      members: { $elemMatch: { user: req.user._id, status: 'invited' } },
    });
    if (!project) throw httpError(404, 'Invitation not found.');
    const member = project.members.find((item) => String(item.user) === String(req.user._id));
    member.status = req.body.response === 'accept' ? 'active' : 'declined';
    await project.save();
    if (member.status === 'active')
      await writeActivity(
        project._id,
        req.user._id,
        'joined',
        `${req.user.name} joined the project.`,
      );
    await Notification.create({
      recipient: project.owner,
      actor: req.user._id,
      type: 'system',
      message: `${req.user.name} ${member.status === 'active' ? 'accepted' : 'declined'} the invitation to ${project.name}.`,
      targetType: 'project',
      target: project._id,
    });
    return res.json({ response: member.status });
  } catch (error) {
    return next(error);
  }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await getVisibleProject(req.params.projectId, req.user._id);
    const member = activeMember(project, req.user._id);
    if (!member && project.visibility !== 'public')
      throw httpError(403, 'You are not a project member.');
    const [tasks, comments, activities, taskCount, completedCount] = await Promise.all([
      ProjectTask.find({ project: project._id })
        .sort({ dueDate: 1, createdAt: -1 })
        .populate('assignee', 'name'),
      ProjectComment.find({ project: project._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('author', 'name'),
      ProjectActivity.find({ project: project._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('actor', 'name'),
      ProjectTask.countDocuments({ project: project._id }),
      ProjectTask.countDocuments({ project: project._id, status: 'completed' }),
    ]);
    const attachments = project.attachments.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      format: file.format,
      addedBy: file.addedBy,
      downloadUrl: signedResourceDownload(file.publicId, file.format, 'raw'),
    }));
    return res.json({
      project: {
        ...project.toObject(),
        attachments: project.attachments.map((file) => ({
          _id: file.id,
          fileName: file.fileName,
          format: file.format,
          bytes: file.bytes,
          addedBy: file.addedBy,
        })),
      },
      tasks,
      comments,
      activities,
      attachments,
      permissions: {
        role: member?.role || 'viewer',
        canEdit: canEdit(project, req.user._id),
        isOwner: String(project.owner._id) === String(req.user._id),
        isMember: Boolean(member),
      },
      progress: taskCount ? Math.round((completedCount / taskCount) * 100) : 0,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:projectId', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || String(project.owner) !== String(req.user._id))
      throw httpError(404, 'Project not found.');
    const allowed = [
      'name',
      'description',
      'category',
      'branch',
      'startDate',
      'endDate',
      'visibility',
      'status',
    ];
    if (Object.keys(req.body || {}).some((key) => !allowed.includes(key)))
      throw httpError(400, 'The project contains an unsupported field.');
    for (const [field, max] of [
      ['name', 120],
      ['description', 5000],
      ['category', 80],
    ]) {
      if (req.body[field] !== undefined)
        project[field] = boundedText(req.body[field], max, field, { required: true });
    }
    if (req.body.branch !== undefined) {
      if (!ENGINEERING_BRANCHES.includes(req.body.branch))
        throw httpError(400, 'Choose a valid engineering branch.');
      project.branch = req.body.branch;
    }
    if (req.body.visibility !== undefined) {
      if (!['private', 'members', 'public'].includes(req.body.visibility))
        throw httpError(400, 'Choose a valid visibility setting.');
      project.visibility = req.body.visibility;
    }
    if (req.body.status !== undefined) {
      if (!['active', 'completed'].includes(req.body.status))
        throw httpError(400, 'Choose a valid project status.');
      project.status = req.body.status;
      if (req.body.status === 'completed')
        await writeActivity(project._id, req.user._id, 'completed', 'Marked the project complete.');
    }
    if (req.body.startDate !== undefined) project.startDate = req.body.startDate || null;
    if (req.body.endDate !== undefined) project.endDate = req.body.endDate || null;
    await project.save();
    await writeActivity(project._id, req.user._id, 'updated', 'Updated project details.');
    return res.json({ project });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:projectId', async (req, res, next) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, owner: req.user._id, status: { $ne: 'archived' } },
      { $set: { status: 'archived' } },
      { new: true },
    );
    if (!project) throw httpError(404, 'Project not found.');
    return res.json({ archived: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/:projectId/invitations', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || String(project.owner) !== String(req.user._id))
      throw httpError(404, 'Project not found.');
    const email = boundedText(req.body?.email, 254, 'Email', { required: true }).toLowerCase();
    const invitee = await User.findOne({
      email,
      status: 'active',
      emailVerifiedAt: { $ne: null },
    }).select('_id name email');
    if (!invitee)
      throw httpError(404, 'No active, verified EngineerHub account was found for that email.');
    if (String(invitee._id) === String(req.user._id))
      throw httpError(400, 'You already own this project.');
    const role = ['editor', 'viewer'].includes(req.body?.role) ? req.body.role : 'viewer';
    const existing = project.members.find((member) => String(member.user) === String(invitee._id));
    if (existing?.status === 'active')
      throw httpError(409, 'This person is already a project member.');
    if (existing) {
      existing.role = role;
      existing.status = 'invited';
      existing.invitedAt = new Date();
    } else project.members.push({ user: invitee._id, role, status: 'invited' });
    await project.save();
    await Notification.create({
      recipient: invitee._id,
      actor: req.user._id,
      type: 'project_invite',
      message: `${req.user.name} invited you to join ${project.name}.`,
      targetType: 'project',
      target: project._id,
    });
    await writeActivity(project._id, req.user._id, 'invited', `Invited ${invitee.name}.`);
    return res.status(201).json({ invitation: { email: invitee.email, role, status: 'invited' } });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:projectId/members/:userId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId))
      throw httpError(400, 'Invalid project member.');
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) throw httpError(404, 'Project not found.');
    if (!['editor', 'viewer'].includes(req.body?.role))
      throw httpError(400, 'Choose editor or viewer.');
    const member = project.members.find(
      (item) => String(item.user) === req.params.userId && item.status === 'active',
    );
    if (!member) throw httpError(404, 'Active project member not found.');
    member.role = req.body.role;
    await project.save();
    return res.json({ member: { user: member.user, role: member.role, status: member.status } });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:projectId/members/:userId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId))
      throw httpError(400, 'Invalid project member.');
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) throw httpError(404, 'Project not found.');
    if (String(req.params.userId) === String(req.user._id))
      throw httpError(400, 'The project owner cannot remove themselves.');
    const member = project.members.find(
      (item) => String(item.user) === req.params.userId && item.status !== 'declined',
    );
    if (!member) throw httpError(404, 'Project member not found.');
    member.status = 'declined';
    await project.save();
    return res.json({ removed: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/:projectId/tasks', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || !activeMember(project, req.user._id) || !canEdit(project, req.user._id))
      throw httpError(404, 'Project not found or you cannot edit it.');
    const task = await ProjectTask.create({
      project: project._id,
      creator: req.user._id,
      title: boundedText(req.body?.title, 160, 'Task title', { required: true }),
      description: boundedText(req.body?.description, 3000, 'Task description'),
      priority: ['low', 'medium', 'high', 'urgent'].includes(req.body?.priority)
        ? req.body.priority
        : 'medium',
      status: 'todo',
      dueDate: req.body?.dueDate || null,
    });
    await writeActivity(project._id, req.user._id, 'task_created', `Created task ${task.title}.`);
    await task.populate('assignee', 'name');
    return res.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:projectId/tasks/:taskId', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || !activeMember(project, req.user._id))
      throw httpError(404, 'Project not found.');
    const task = await ProjectTask.findOne({ _id: req.params.taskId, project: project._id });
    if (!task) throw httpError(404, 'Task not found.');
    const assignedToMe = String(task.assignee) === String(req.user._id);
    if (!canEdit(project, req.user._id) && !assignedToMe)
      throw httpError(403, 'You cannot update this task.');
    const allowed = ['title', 'description', 'priority', 'status', 'dueDate', 'assignee'];
    if (Object.keys(req.body || {}).some((key) => !allowed.includes(key)))
      throw httpError(400, 'The task contains an unsupported field.');
    if (req.body.title !== undefined && !canEdit(project, req.user._id))
      throw httpError(403, 'Only editors can rename tasks.');
    if (req.body.description !== undefined && !canEdit(project, req.user._id))
      throw httpError(403, 'Only editors can edit task details.');
    if (req.body.priority !== undefined && !canEdit(project, req.user._id))
      throw httpError(403, 'Only editors can change task priority.');
    if (req.body.assignee !== undefined && !canEdit(project, req.user._id))
      throw httpError(403, 'Only editors can assign tasks.');
    if (req.body.title !== undefined)
      task.title = boundedText(req.body.title, 160, 'Task title', { required: true });
    if (req.body.description !== undefined)
      task.description = boundedText(req.body.description, 3000, 'Task description');
    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.status !== undefined) task.status = req.body.status;
    if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate || null;
    if (req.body.assignee !== undefined) {
      if (req.body.assignee && !activeMember(project, req.body.assignee))
        throw httpError(400, 'Tasks can only be assigned to active project members.');
      task.assignee = req.body.assignee || null;
      if (task.assignee)
        await Notification.create({
          recipient: task.assignee,
          actor: req.user._id,
          type: 'system',
          message: `${req.user.name} assigned you to ${task.title}.`,
          targetType: 'project',
          target: project._id,
        });
    }
    await task.save();
    await task.populate('assignee', 'name');
    await writeActivity(project._id, req.user._id, 'task_updated', `Updated task ${task.title}.`);
    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:projectId/tasks/:taskId', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) throw httpError(404, 'Project not found.');
    const result = await ProjectTask.deleteOne({ _id: req.params.taskId, project: project._id });
    if (!result.deletedCount) throw httpError(404, 'Task not found.');
    await writeActivity(project._id, req.user._id, 'task_updated', 'Deleted a task.');
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/:projectId/comments', async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      status: { $ne: 'archived' },
      'members.user': req.user._id,
      'members.status': 'active',
    });
    if (!project) throw httpError(404, 'Project not found or you are not a member.');
    const comment = await ProjectComment.create({
      project: project._id,
      author: req.user._id,
      body: boundedText(req.body?.body, 3000, 'Comment', { required: true }),
    });
    await comment.populate('author', 'name');
    await writeActivity(project._id, req.user._id, 'commented', 'Added a project comment.');
    return res.status(201).json({ comment });
  } catch (error) {
    return next(error);
  }
});

router.post('/:projectId/attachments', resourceUpload, async (req, res, next) => {
  let stored;
  let persisted = false;
  try {
    if (!req.file) throw httpError(400, 'Choose a permitted PDF or document file.');
    if (!validFileContent(req.file))
      throw httpError(415, 'The file content does not match an allowed document type.');
    const project = await Project.findById(req.params.projectId);
    if (!project || !canEdit(project, req.user._id))
      throw httpError(404, 'Project not found or you cannot edit it.');
    if (project.attachments.length >= 20)
      throw httpError(400, 'Projects can include up to 20 attachments.');
    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    stored = await uploadBuffer(req.file.buffer, {
      folder: 'project-attachments',
      resourceType: 'raw',
      format: ext,
      access: 'authenticated',
    });
    project.attachments.push({
      publicId: stored.public_id,
      fileName: boundedText(req.file.originalname, 180, 'Filename'),
      format: ext,
      bytes: req.file.size,
      addedBy: req.user._id,
    });
    await project.save();
    persisted = true;
    await writeActivity(
      project._id,
      req.user._id,
      'attachment_added',
      `Added ${req.file.originalname}.`,
    );
    return res
      .status(201)
      .json({ attachment: { id: project.attachments.at(-1).id, fileName: req.file.originalname } });
  } catch (error) {
    if (stored?.public_id && !persisted) {
      try {
        await deleteStoredFile(stored.public_id, 'raw');
      } catch (cleanupError) {
        console.error('Project attachment cleanup failed:', cleanupError);
      }
    }
    return next(error);
  }
});

router.get('/:projectId/attachments/:attachmentId', async (req, res, next) => {
  try {
    const project = await getVisibleProject(req.params.projectId, req.user._id);
    if (!activeMember(project, req.user._id) && project.visibility !== 'public')
      throw httpError(403, 'Project access denied.');
    const attachment = project.attachments.id(req.params.attachmentId);
    if (!attachment) throw httpError(404, 'Attachment not found.');
    return res.json({ url: signedResourceDownload(attachment.publicId, attachment.format, 'raw') });
  } catch (error) {
    return next(error);
  }
});

export default router;
