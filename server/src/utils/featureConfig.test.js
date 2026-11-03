import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFeatureUpdates } from './featureConfig.js';

test('validates feature settings and deduplicates role and permission lists', () => {
  assert.deepEqual(
    validateFeatureUpdates({
      enabled: false,
      showWhenDisabled: true,
      allowedRoles: ['member', 'student', 'member'],
      requiredPermissions: ['tools:access', 'tools:access'],
    }),
    {
      enabled: false,
      showWhenDisabled: true,
      allowedRoles: ['member', 'student'],
      requiredPermissions: ['tools:access'],
    },
  );
});

test('rejects unknown fields and invalid feature control values', () => {
  assert.throws(() => validateFeatureUpdates({ role: 'admin' }), { status: 400 });
  assert.throws(() => validateFeatureUpdates({ enabled: 'false' }), { status: 400 });
  assert.throws(() => validateFeatureUpdates({ allowedRoles: ['root'] }), { status: 400 });
  assert.throws(() => validateFeatureUpdates({ requiredPermissions: ['unknown:permission'] }), {
    status: 400,
  });
  assert.throws(() => validateFeatureUpdates({ availabilityMessage: '  ' }), { status: 400 });
});
