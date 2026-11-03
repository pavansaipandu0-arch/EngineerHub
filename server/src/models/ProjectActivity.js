import mongoose from 'mongoose';

const projectActivitySchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['created', 'updated', 'invited', 'joined', 'task_created', 'task_updated', 'commented', 'attachment_added', 'completed'], required: true },
  detail: { type: String, trim: true, maxlength: 240, default: '' },
}, { timestamps: true, versionKey: false });

projectActivitySchema.index({ project: 1, createdAt: -1 });

export default mongoose.model('ProjectActivity', projectActivitySchema);
