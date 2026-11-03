import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  body: { type: String, trim: true, required: true, maxlength: 2000 },
  status: { type: String, enum: ['published', 'hidden', 'removed'], default: 'published', index: true },
}, { timestamps: true, versionKey: false });

commentSchema.index({ post: 1, parent: 1, createdAt: 1 });

export default mongoose.model('Comment', commentSchema);
