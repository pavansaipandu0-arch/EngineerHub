import mongoose from 'mongoose';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  body: { type: String, trim: true, required: true, maxlength: 5000 },
  branch: { type: String, enum: ENGINEERING_BRANCHES, required: true },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
  image: {
    url: { type: String, trim: true, maxlength: 1000, default: '' },
    publicId: { type: String, trim: true, maxlength: 255, default: '' },
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['published', 'hidden', 'removed'], default: 'published', index: true },
}, { timestamps: true, versionKey: false });

postSchema.index({ status: 1, branch: 1, createdAt: -1 });
postSchema.index({ status: 1, likes: -1, createdAt: -1 });
postSchema.index({ body: 'text', tags: 'text' });

export default mongoose.model('Post', postSchema);
