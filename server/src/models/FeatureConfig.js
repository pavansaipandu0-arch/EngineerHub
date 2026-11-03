import mongoose from 'mongoose';

const featureConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      match: /^[a-z0-9-]+$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 240 },
    category: { type: String, trim: true, maxlength: 50, default: 'Workspace' },
    implemented: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true },
    showWhenDisabled: { type: Boolean, default: false },
    maintenance: { type: Boolean, default: false },
    availabilityMessage: {
      type: String,
      default: 'This module is temporarily unavailable.',
      trim: true,
      maxlength: 180,
    },
    allowedRoles: {
      type: [{ type: String, enum: ['member', 'admin', 'student', 'engineer', 'employer'] }],
      default: ['member', 'admin'],
    },
    requiredPermissions: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'features' },
);

export default mongoose.models.FeatureConfig ||
  mongoose.model('FeatureConfig', featureConfigSchema);
