import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended'],
      default: 'pending_verification',
      index: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    branch: {
      type: String,
      required: true,
      enum: [
        'aerospace',
        'biomedical',
        'chemical',
        'civil',
        'computer',
        'electrical',
        'environmental',
        'industrial',
        'materials',
        'mechanical',
        'other',
      ],
    },
    userType: { type: String, required: true, enum: ['student', 'engineer', 'employer'] },
    organization: { type: String, trim: true, maxlength: 120, default: '' },
    emailVerificationTokenHash: { type: String, select: false, default: null },
    emailVerificationExpiresAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

export default mongoose.model('User', userSchema);
