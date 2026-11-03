import mongoose from 'mongoose';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
  status: { type: String, enum: ['invited', 'active', 'declined'], default: 'invited' },
  invitedAt: { type: Date, default: Date.now },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, trim: true, required: true, maxlength: 120 },
  description: { type: String, trim: true, required: true, maxlength: 5000 },
  category: { type: String, trim: true, required: true, maxlength: 80 },
  branch: { type: String, enum: ENGINEERING_BRANCHES, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  visibility: { type: String, enum: ['private', 'members', 'public'], default: 'private' },
  members: { type: [memberSchema], default: [] },
  attachments: [{
    publicId: { type: String, required: true },
    fileName: { type: String, required: true, maxlength: 180 },
    format: { type: String, required: true, maxlength: 20 },
    bytes: { type: Number, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  }],
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active', index: true },
}, { timestamps: true, versionKey: false });

projectSchema.index({ owner: 1, updatedAt: -1 });
projectSchema.index({ 'members.user': 1, 'members.status': 1, updatedAt: -1 });

export default mongoose.model('Project', projectSchema);
