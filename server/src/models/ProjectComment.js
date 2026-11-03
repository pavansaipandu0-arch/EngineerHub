import mongoose from 'mongoose';

const projectCommentSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, trim: true, required: true, maxlength: 3000 },
}, { timestamps: true, versionKey: false });

projectCommentSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model('ProjectComment', projectCommentSchema);
