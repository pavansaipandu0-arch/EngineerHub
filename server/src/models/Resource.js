import mongoose from 'mongoose';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const resourceSchema = new mongoose.Schema({
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, required: true, maxlength: 180 },
  description: { type: String, trim: true, required: true, maxlength: 3000 },
  branch: { type: String, enum: ENGINEERING_BRANCHES, required: true },
  category: { type: String, trim: true, required: true, maxlength: 80 },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
  storage: {
    provider: { type: String, enum: ['cloudinary'], required: true },
    publicId: { type: String, required: true, maxlength: 255 },
    resourceType: { type: String, enum: ['image', 'raw'], required: true },
    format: { type: String, required: true, maxlength: 20 },
    bytes: { type: Number, min: 1, max: 20 * 1024 * 1024, required: true },
    originalName: { type: String, required: true, maxlength: 180 },
    mimeType: { type: String, required: true, maxlength: 120 },
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'removed'], default: 'pending', index: true },
  rightsConfirmedAt: { type: Date, required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ratingCount: { type: Number, min: 0, default: 0 },
  ratingTotal: { type: Number, min: 0, default: 0 },
}, { timestamps: true, versionKey: false });

resourceSchema.index({ status: 1, branch: 1, createdAt: -1 });
resourceSchema.index({ status: 1, title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Resource', resourceSchema);
