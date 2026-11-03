import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['post', 'question', 'resource'], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true, versionKey: false });

bookmarkSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Bookmark', bookmarkSchema);
