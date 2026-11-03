import mongoose from 'mongoose';

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['user', 'question'], required: true, default: 'user' },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
  targetModel: { type: String, enum: ['User', 'Question'], required: true },
}, { timestamps: true, versionKey: false });

followSchema.index({ follower: 1, targetType: 1, target: 1 }, { unique: true });
followSchema.index({ targetType: 1, target: 1, createdAt: -1 });

export default mongoose.model('Follow', followSchema);
