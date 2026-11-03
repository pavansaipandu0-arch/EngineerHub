import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseOptions } from './database.js';

test('database options enable TLS and disable automatic indexes in production', () => {
  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const options = databaseOptions();
    assert.equal(options.tls, true);
    assert.equal(options.autoIndex, false);
    assert.equal(options.maxPoolSize, 20);
    assert.equal(options.minPoolSize, 2);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('database options reject invalid pool sizes', () => {
  const previousMax = process.env.MONGODB_MAX_POOL_SIZE;
  const previousMin = process.env.MONGODB_MIN_POOL_SIZE;
  process.env.MONGODB_MAX_POOL_SIZE = '2';
  process.env.MONGODB_MIN_POOL_SIZE = '3';
  try {
    assert.throws(databaseOptions, /pool sizes must be valid integers/);
  } finally {
    if (previousMax === undefined) delete process.env.MONGODB_MAX_POOL_SIZE;
    else process.env.MONGODB_MAX_POOL_SIZE = previousMax;
    if (previousMin === undefined) delete process.env.MONGODB_MIN_POOL_SIZE;
    else process.env.MONGODB_MIN_POOL_SIZE = previousMin;
  }
});
