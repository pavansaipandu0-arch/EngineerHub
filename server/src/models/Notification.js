import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: { type: String, enum: ['follow', 'project_invite', 'answer', 'comment', 'resource_approved', 'system'], required: true },
  message: { type: String, trim: true, required: true, maxlength: 240 },
  targetType: { type: String, enum: ['post', 'question', 'project', 'resource', 'profile'], default: null },
  target: { type: mongoose.Schema.Types.ObjectId, default: null },
  readAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });

export default mongoose.model('Notification', notificationSchema);
