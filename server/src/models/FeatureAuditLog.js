import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, maxlength: 60 },
    previous: { type: mongoose.Schema.Types.Mixed },
    current: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const featureAuditLogSchema = new mongoose.Schema(
  {
    featureKey: { type: String, required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['updated', 'emergency_disable'], required: true },
    changes: { type: [changeSchema], required: true },
  },
  { timestamps: true, versionKey: false },
);

featureAuditLogSchema.index({ featureKey: 1, createdAt: -1 });
featureAuditLogSchema.index({ actor: 1, createdAt: -1 });

export default mongoose.model('FeatureAuditLog', featureAuditLogSchema);
