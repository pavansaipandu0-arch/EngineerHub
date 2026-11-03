import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { databaseOptions } from '../config/database.js';
import { validatePassword, normalizeEmail, isValidEmail } from '../validators/auth.js';

const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error(
    'Set MONGODB_URI, ADMIN_EMAIL, and ADMIN_PASSWORD before seeding an administrator.',
  );
}
if (!isValidEmail(ADMIN_EMAIL) || validatePassword(ADMIN_PASSWORD)) {
  throw new Error(
    'Provide a valid ADMIN_EMAIL and an ADMIN_PASSWORD with 12-128 characters, uppercase, lowercase, a number, and a symbol.',
  );
}

try {
  await mongoose.connect(MONGODB_URI, databaseOptions());
  const email = normalizeEmail(ADMIN_EMAIL);
  const existing = await User.findOne({ email }).select('+passwordHash');
  if (existing) {
    existing.role = 'admin';
    existing.status = 'active';
    existing.emailVerifiedAt ||= new Date();
    existing.branch ||= 'other';
    existing.userType ||= 'engineer';
    await existing.setPassword(ADMIN_PASSWORD);
    await existing.save();
    console.log(`Administrator credentials updated for ${email}.`);
  } else {
    const admin = new User({
      name: 'EngineerHub Admin',
      email,
      branch: 'other',
      userType: 'engineer',
      role: 'admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    });
    await admin.setPassword(ADMIN_PASSWORD);
    await admin.save();
    console.log(`Administrator account created for ${email}.`);
  }
} finally {
  await mongoose.disconnect();
}
