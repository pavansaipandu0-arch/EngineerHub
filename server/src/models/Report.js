import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['post', 'comment', 'question', 'answer', 'resource'], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, enum: ['spam', 'harassment', 'copyright', 'unsafe', 'other'], required: true },
  details: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending', 'reviewed', 'dismissed', 'actioned'], default: 'pending' },
}, { timestamps: true, versionKey: false });

reportSchema.index({ reporter: 1, targetType: 1, target: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model('Report', reportSchema);
