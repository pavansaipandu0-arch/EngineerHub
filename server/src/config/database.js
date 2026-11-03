import mongoose from 'mongoose';
import Feature from '../models/Feature.js';
import User from '../models/User.js';
import { DEFAULT_FEATURES } from './features.js';
import { log } from '../utils/logger.js';

const RETRY_DELAY_MS = 5000;
let retryTimer;
let shuttingDown = false;
let databaseInitialized = false;

export function databaseOptions() {
  const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE || 20);
  const minPoolSize = Number(process.env.MONGODB_MIN_POOL_SIZE || 2);
  if (
    !Number.isInteger(maxPoolSize) ||
    !Number.isInteger(minPoolSize) ||
    minPoolSize < 0 ||
    maxPoolSize < 1 ||
    minPoolSize > maxPoolSize
  ) {
    throw new Error('MongoDB pool sizes must be valid integers with 0 <= min <= max.');
  }
  return {
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    autoIndex: process.env.NODE_ENV !== 'production',
    ...(process.env.NODE_ENV === 'production' ? { tls: true } : {}),
  };
}

mongoose.connection.on('connected', () => {
  log('info', 'mongodb_connected');
});

mongoose.connection.on('disconnected', () => {
  log('warn', 'mongodb_disconnected');
});

mongoose.connection.on('error', (error) => {
  log('error', 'mongodb_connection_error', { name: error.name });
});

export function getDatabaseStatus() {
  return getDatabaseHealthStatus(mongoose.connection.readyState, databaseInitialized);
}

export function getDatabaseHealthStatus(readyState, initialized) {
  const status = ['disconnected', 'connected', 'connecting', 'disconnecting'][readyState];
  return status === 'connected' && !initialized ? 'connecting' : status;
}

async function seedDefaultFeatures() {
  for (const feature of DEFAULT_FEATURES) {
    const defaults = {
      ...feature,
      showWhenDisabled: false,
      maintenance: false,
      availabilityMessage: feature.availabilityMessage || 'This module is temporarily unavailable.',
      allowedRoles: ['member', 'admin'],
      requiredPermissions: feature.requiredPermissions || [],
      updatedBy: null,
    };
    await Feature.updateOne({ key: feature.key }, { $setOnInsert: defaults }, { upsert: true });
    const stored = await Feature.findOne({ key: feature.key }).lean();
    const missingDefaults = Object.fromEntries(
      Object.entries(defaults).filter(([field]) => !Object.hasOwn(stored, field)),
    );
    if (Object.keys(missingDefaults).length) {
      await Feature.collection.updateOne({ _id: stored._id }, { $set: missingDefaults });
    }
  }
}

async function migrateExistingAccounts() {
  await User.updateMany(
    { status: { $exists: false } },
    {
      $set: {
        status: 'pending_verification',
        branch: 'other',
        userType: 'engineer',
        organization: '',
        emailVerifiedAt: null,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    },
  );
}

export async function connectDatabase() {
  if (shuttingDown) return;
  databaseInitialized = false;
  try {
    await mongoose.connect(process.env.MONGODB_URI, databaseOptions());
    if (shuttingDown) {
      await mongoose.disconnect();
      return;
    }
    await migrateExistingAccounts();
    await seedDefaultFeatures();
    databaseInitialized = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  } catch (error) {
    log('error', 'mongodb_startup_failed', { name: error.name });
    if (!shuttingDown && !retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        connectDatabase();
      }, RETRY_DELAY_MS);
      retryTimer.unref();
    }
  }
}

export function stopDatabaseRetries() {
  shuttingDown = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }
}

export async function closeDatabase() {
  stopDatabaseRetries();
  await mongoose.disconnect();
}
