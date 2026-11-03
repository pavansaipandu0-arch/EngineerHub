import test from 'node:test';
import assert from 'node:assert/strict';
import { hasFeaturePermissions } from './permissions.js';

test('feature permissions derive from server-controlled account roles and types', () => {
  assert.equal(
    hasFeaturePermissions({ role: 'member', userType: 'student' }, ['tools:access']),
    true,
  );
  assert.equal(
    hasFeaturePermissions({ role: 'member', userType: 'student' }, ['jobs:manage']),
    false,
  );
  assert.equal(
    hasFeaturePermissions({ role: 'member', userType: 'employer' }, ['jobs:manage']),
    true,
  );
  assert.equal(
    hasFeaturePermissions({ role: 'admin', userType: 'engineer' }, ['unknown:permission']),
    true,
  );
});
