import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    userAgent: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true, versionKey: false },
);

sessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Session', sessionSchema);
