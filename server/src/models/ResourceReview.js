import mongoose from 'mongoose';

const resourceReviewSchema = new mongoose.Schema({
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  body: { type: String, trim: true, maxlength: 1500, default: '' },
}, { timestamps: true, versionKey: false });

resourceReviewSchema.index({ resource: 1, author: 1 }, { unique: true });
resourceReviewSchema.index({ resource: 1, createdAt: -1 });

export default mongoose.model('ResourceReview', resourceReviewSchema);
