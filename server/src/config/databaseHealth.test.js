import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabaseHealthStatus } from './database.js';

test('database readiness waits for startup initialization after connection', () => {
  assert.equal(getDatabaseHealthStatus(1, false), 'connecting');
  assert.equal(getDatabaseHealthStatus(1, true), 'connected');
});

test('database readiness reports disconnected and connecting states', () => {
  assert.equal(getDatabaseHealthStatus(0, true), 'disconnected');
  assert.equal(getDatabaseHealthStatus(2, false), 'connecting');
});
