import mongoose from 'mongoose';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const questionSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, required: true, maxlength: 180 },
  body: { type: String, trim: true, required: true, maxlength: 10000 },
  branch: { type: String, enum: ENGINEERING_BRANCHES, required: true },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
  attachments: [{
    url: { type: String, trim: true, maxlength: 1000 },
    publicId: { type: String, trim: true, maxlength: 255 },
    fileName: { type: String, trim: true, maxlength: 180 },
    format: { type: String, trim: true, maxlength: 20 },
  }],
  answersCount: { type: Number, min: 0, default: 0 },
  views: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['open', 'answered', 'closed', 'hidden', 'removed'], default: 'open', index: true },
  bestAnswer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', default: null },
}, { timestamps: true, versionKey: false });

questionSchema.index({ status: 1, branch: 1, createdAt: -1 });
questionSchema.index({ status: 1, answersCount: -1, createdAt: -1 });
questionSchema.index({ title: 'text', body: 'text', tags: 'text' });

export default mongoose.model('Question', questionSchema);
