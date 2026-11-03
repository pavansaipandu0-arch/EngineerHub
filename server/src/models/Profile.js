import mongoose from 'mongoose';
import { ENGINEERING_BRANCHES } from '../validators/auth.js';

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    organization: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1500, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
  },
  { _id: true },
);

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, required: true, trim: true, maxlength: 120 },
    degree: { type: String, required: true, trim: true, maxlength: 120 },
    field: { type: String, trim: true, maxlength: 120, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: true },
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    issuer: { type: String, required: true, trim: true, maxlength: 120 },
    issuedAt: { type: Date },
    credentialUrl: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: true },
);

const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1500, default: '' },
    url: { type: String, trim: true, maxlength: 500, default: '' },
    branch: { type: String, enum: ENGINEERING_BRANCHES, default: 'other' },
  },
  { _id: true },
);

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    headline: { type: String, trim: true, maxlength: 160, default: '' },
    biography: { type: String, trim: true, maxlength: 3000, default: '' },
    branch: { type: String, enum: ENGINEERING_BRANCHES, required: true },
    organization: { type: String, trim: true, maxlength: 120, default: '' },
    photo: {
      url: { type: String, trim: true, maxlength: 1000, default: '' },
      publicId: { type: String, trim: true, maxlength: 255, default: '' },
    },
    skills: [{ type: String, trim: true, maxlength: 60 }],
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    portfolio: { type: [portfolioSchema], default: [] },
    links: {
      github: { type: String, trim: true, maxlength: 500, default: '' },
      linkedin: { type: String, trim: true, maxlength: 500, default: '' },
      website: { type: String, trim: true, maxlength: 500, default: '' },
    },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  },
  { timestamps: true, versionKey: false },
);

profileSchema.index({ branch: 1, visibility: 1, updatedAt: -1 });

export default mongoose.model('Profile', profileSchema);
