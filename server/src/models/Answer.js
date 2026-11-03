import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, trim: true, required: true, maxlength: 10000 },
  votes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    value: { type: Number, enum: [-1, 1], required: true },
  }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, trim: true, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  }],
  status: { type: String, enum: ['published', 'hidden', 'removed'], default: 'published', index: true },
}, { timestamps: true, versionKey: false });

answerSchema.index({ question: 1, createdAt: 1 });
answerSchema.index({ question: 1, 'votes.value': -1 });

export default mongoose.model('Answer', answerSchema);
