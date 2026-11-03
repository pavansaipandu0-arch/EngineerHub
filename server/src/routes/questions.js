import { Router } from 'express';
import mongoose from 'mongoose';
import Answer from '../models/Answer.js';
import Follow from '../models/Follow.js';
import Notification from '../models/Notification.js';
import Question from '../models/Question.js';
import { requireAuth, requireEnabledFeature } from '../middleware/auth.js';
import { resourceUpload, validFileContent } from '../middleware/upload.js';
import { deleteStoredFile, signedResourceDownload, uploadBuffer } from '../services/storage.js';
import { boundedText, httpError, pagination, paginatedResponse, validTags } from '../utils/http.js';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const router = Router();
router.use(requireAuth, requireEnabledFeature('question-board'));

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = { status: { $in: ['open', 'answered', 'closed'] } };
    if (req.query.branch && ENGINEERING_BRANCHES.includes(req.query.branch))
      filter.branch = req.query.branch;
    if (req.query.tag) filter.tags = String(req.query.tag).trim().toLowerCase().slice(0, 30);
    if (req.query.search) filter.$text = { $search: String(req.query.search).trim().slice(0, 150) };
    const sort =
      req.query.sort === 'popular' ? { answersCount: -1, createdAt: -1 } : { createdAt: -1 };
    const [questions, total] = await Promise.all([
      Question.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('author', 'name userType branch')
        .populate('bestAnswer', 'author body'),
      Question.countDocuments(filter),
    ]);
    return res.json({ questions, pagination: paginatedResponse(page, limit, total) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const branch = req.body?.branch || req.user.branch;
    if (!ENGINEERING_BRANCHES.includes(branch))
      throw httpError(400, 'Choose a valid engineering branch.');
    const question = await Question.create({
      author: req.user._id,
      title: boundedText(req.body?.title, 180, 'Question title', { required: true }),
      body: boundedText(req.body?.body, 10000, 'Question details', { required: true }),
      branch,
      tags: validTags(req.body?.tags),
    });
    await question.populate('author', 'name userType branch');
    return res.status(201).json({ question });
  } catch (error) {
    return next(error);
  }
});

router.get('/:questionId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.questionId)) throw httpError(400, 'Invalid question.');
    const question = await Question.findOneAndUpdate(
      { _id: req.params.questionId, status: { $in: ['open', 'answered', 'closed'] } },
      { $inc: { views: 1 } },
      { new: true },
    )
      .populate('author', 'name userType branch')
      .populate('bestAnswer', 'author body');
    if (!question) throw httpError(404, 'Question not found.');
    const follows = await Follow.exists({
      follower: req.user._id,
      targetType: 'question',
      target: question._id,
    });
    const answers = await Answer.find({ question: question._id, status: 'published' })
      .sort({ createdAt: 1 })
      .populate('author', 'name userType branch');
    const related = await Question.find({
      _id: { $ne: question._id },
      status: { $in: ['open', 'answered', 'closed'] },
      branch: question.branch,
      $or: [{ tags: { $in: question.tags } }, { branch: question.branch }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title branch tags answersCount createdAt');
    const questionView = question.toObject();
    questionView.attachments = question.attachments.map((file) => ({
      _id: file.id,
      fileName: file.fileName,
      format: file.format,
    }));
    return res.json({ question: questionView, answers, related, followedByMe: Boolean(follows) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:questionId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.questionId)) throw httpError(400, 'Invalid question.');
    const question = await Question.findOne({
      _id: req.params.questionId,
      author: req.user._id,
      status: { $nin: ['hidden', 'removed'] },
    });
    if (!question) throw httpError(404, 'Question not found.');
    if (req.body?.title !== undefined)
      question.title = boundedText(req.body.title, 180, 'Question title', { required: true });
    if (req.body?.body !== undefined)
      question.body = boundedText(req.body.body, 10000, 'Question details', { required: true });
    if (req.body?.branch !== undefined) {
      if (!ENGINEERING_BRANCHES.includes(req.body.branch))
        throw httpError(400, 'Choose a valid engineering branch.');
      question.branch = req.body.branch;
    }
    if (req.body?.tags !== undefined) question.tags = validTags(req.body.tags);
    await question.save();
    return res.json({ question });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:questionId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.questionId)) throw httpError(400, 'Invalid question.');
    const question = await Question.findOneAndUpdate(
      { _id: req.params.questionId, author: req.user._id, status: { $nin: ['hidden', 'removed'] } },
      { $set: { status: 'removed' } },
      { new: true },
    );
    if (!question) throw httpError(404, 'Question not found.');
    await Answer.updateMany({ question: question._id }, { $set: { status: 'removed' } });
    for (const file of question.attachments) {
      try {
        await deleteStoredFile(file.publicId, 'raw');
      } catch (cleanupError) {
        console.error('Removed question attachment cleanup failed:', cleanupError);
      }
    }
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/:questionId/attachments', resourceUpload, async (req, res, next) => {
  let stored;
  let persisted = false;
  try {
    if (!mongoose.isValidObjectId(req.params.questionId)) throw httpError(400, 'Invalid question.');
    if (!req.file) throw httpError(400, 'Choose a permitted PDF or document file.');
    if (!validFileContent(req.file))
      throw httpError(415, 'The file content does not match an allowed document type.');
    const question = await Question.findOne({
      _id: req.params.questionId,
      author: req.user._id,
      status: { $nin: ['hidden', 'removed'] },
    });
    if (!question) throw httpError(404, 'Question not found.');
    if (question.attachments.length >= 5)
      throw httpError(400, 'Questions can include up to five attachments.');
    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    stored = await uploadBuffer(req.file.buffer, {
      folder: 'question-attachments',
      resourceType: 'raw',
      format: ext,
      access: 'authenticated',
    });
    question.attachments.push({
      publicId: stored.public_id,
      fileName: boundedText(req.file.originalname, 180, 'Filename'),
      format: ext,
    });
    await question.save();
    persisted = true;
    const attachment = question.attachments.at(-1);
    return res.status(201).json({
      attachment: { id: attachment.id, fileName: attachment.fileName, format: attachment.format },
    });
  } catch (error) {
    if (stored?.public_id && !persisted) {
      try {
        await deleteStoredFile(stored.public_id, 'raw');
      } catch (cleanupError) {
        console.error('Question attachment cleanup failed:', cleanupError);
      }
    }
    return next(error);
  }
});

router.get('/:questionId/attachments/:attachmentId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.questionId)) throw httpError(400, 'Invalid question.');
    const question = await Question.findOne({
      _id: req.params.questionId,
      status: { $in: ['open', 'answered', 'closed'] },
    });
    if (!question) throw httpError(404, 'Question not found.');
    const attachment = question.attachments.id(req.params.attachmentId);
    if (!attachment) throw httpError(404, 'Attachment not found.');
    return res.json({ url: signedResourceDownload(attachment.publicId, attachment.format, 'raw') });
  } catch (error) {
    return next(error);
  }
});

router.post('/:questionId/follow', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.questionId)) throw httpError(400, 'Invalid question.');
    const question = await Question.findOne({
      _id: req.params.questionId,
      status: { $in: ['open', 'answered', 'closed'] },
    }).select('author title');
    if (!question) throw httpError(404, 'Question not found.');
    const filter = {
      follower: req.user._id,
      targetType: 'question',
      target: question._id,
      targetModel: 'Question',
    };
    if (await Follow.exists(filter)) {
      await Follow.deleteOne(filter);
      return res.json({ following: false });
    }
    await Follow.create(filter);
    return res.json({ following: true });
  } catch (error) {
    if (error.code === 11000) return res.json({ following: true });
    return next(error);
  }
});

router.post('/:questionId/answers', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.questionId)) throw httpError(400, 'Invalid question.');
    const question = await Question.findOne({ _id: req.params.questionId, status: 'open' });
    if (!question) throw httpError(404, 'This question is closed or unavailable.');
    const answer = await Answer.create({
      question: question._id,
      author: req.user._id,
      body: boundedText(req.body?.body, 10000, 'Answer', { required: true }),
    });
    await Question.updateOne({ _id: question._id }, { $inc: { answersCount: 1 } });
    await answer.populate('author', 'name userType branch');
    if (String(question.author) !== String(req.user._id)) {
      await Notification.create({
        recipient: question.author,
        actor: req.user._id,
        type: 'answer',
        message: `${req.user.name} answered your question.`,
        targetType: 'question',
        target: question._id,
      });
    }
    return res.status(201).json({ answer });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:questionId/answers/:answerId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.answerId)) throw httpError(400, 'Invalid answer.');
    const answer = await Answer.findOneAndUpdate(
      {
        _id: req.params.answerId,
        question: req.params.questionId,
        author: req.user._id,
        status: 'published',
      },
      { $set: { body: boundedText(req.body?.body, 10000, 'Answer', { required: true }) } },
      { new: true, runValidators: true },
    ).populate('author', 'name userType branch');
    if (!answer) throw httpError(404, 'Answer not found.');
    return res.json({ answer });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:questionId/answers/:answerId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.answerId)) throw httpError(400, 'Invalid answer.');
    const answer = await Answer.findOneAndUpdate(
      {
        _id: req.params.answerId,
        question: req.params.questionId,
        author: req.user._id,
        status: 'published',
      },
      { $set: { status: 'removed' } },
      { new: true },
    );
    if (!answer) throw httpError(404, 'Answer not found.');
    const question = await Question.findById(answer.question).select('bestAnswer');
    const removedBestAnswer = String(question?.bestAnswer) === String(answer._id);
    const questionUpdate = { $inc: { answersCount: -1 } };
    if (removedBestAnswer) {
      questionUpdate.$set = { bestAnswer: null, status: 'open' };
    }
    await Question.updateOne({ _id: answer.question }, questionUpdate);
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/:questionId/answers/:answerId/vote', async (req, res, next) => {
  try {
    const value = Number(req.body?.value);
    if (![-1, 1].includes(value)) throw httpError(400, 'Vote must be 1 or -1.');
    const answer = await Answer.findOne({
      _id: req.params.answerId,
      question: req.params.questionId,
      status: 'published',
    });
    if (!answer) throw httpError(404, 'Answer not found.');
    const existing = answer.votes.find((vote) => String(vote.user) === String(req.user._id));
    if (existing?.value === value) {
      await Answer.updateOne({ _id: answer._id }, { $pull: { votes: { user: req.user._id } } });
      return res.json({
        value: 0,
        score: answer.votes.reduce((sum, vote) => sum + vote.value, 0) - value,
      });
    }
    if (existing) {
      await Answer.updateOne(
        { _id: answer._id, 'votes.user': req.user._id },
        { $set: { 'votes.$.value': value } },
      );
      return res.json({
        value,
        score: answer.votes.reduce((sum, vote) => sum + vote.value, 0) - existing.value + value,
      });
    }
    const result = await Answer.updateOne(
      { _id: answer._id, 'votes.user': { $ne: req.user._id } },
      { $push: { votes: { user: req.user._id, value } } },
    );
    if (!result.modifiedCount) {
      await Answer.updateOne(
        { _id: answer._id, 'votes.user': req.user._id },
        { $set: { 'votes.$.value': value } },
      );
    }
    return res.json({
      value,
      score: answer.votes.reduce((sum, vote) => sum + vote.value, 0) + value,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:questionId/answers/:answerId/comments', async (req, res, next) => {
  try {
    const answer = await Answer.findOne({
      _id: req.params.answerId,
      question: req.params.questionId,
      status: 'published',
    });
    if (!answer) throw httpError(404, 'Answer not found.');
    answer.comments.push({
      author: req.user._id,
      body: boundedText(req.body?.body, 1000, 'Comment', { required: true }),
    });
    await answer.save();
    await answer.populate('comments.author', 'name');
    return res.status(201).json({ comment: answer.comments.at(-1) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:questionId/answers/:answerId/best', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.answerId)) throw httpError(400, 'Invalid answer.');
    const question = await Question.findOne({
      _id: req.params.questionId,
      author: req.user._id,
      status: { $in: ['open', 'answered'] },
    });
    if (!question) throw httpError(404, 'Question not found.');
    const answer = await Answer.findOne({
      _id: req.params.answerId,
      question: question._id,
      status: 'published',
    });
    if (!answer) throw httpError(404, 'Answer not found.');
    question.bestAnswer = answer._id;
    question.status = 'answered';
    await question.save();
    return res.json({ bestAnswer: answer._id, status: question.status });
  } catch (error) {
    return next(error);
  }
});

export default router;
