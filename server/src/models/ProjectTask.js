import mongoose from 'mongoose';

const projectTaskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  title: { type: String, trim: true, required: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'completed'], default: 'todo' },
  dueDate: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

projectTaskSchema.index({ project: 1, status: 1, dueDate: 1 });
projectTaskSchema.index({ assignee: 1, status: 1 });

export default mongoose.model('ProjectTask', projectTaskSchema);
