import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFeatureAccess } from './featureAccess.js';

const member = { role: 'member', userType: 'student' };
const activeFeature = {
  implemented: true,
  enabled: true,
  maintenance: false,
  availabilityMessage: 'Module unavailable',
  allowedRoles: ['member'],
  requiredPermissions: ['tools:access'],
};

test('feature access blocks missing, disabled, unimplemented, and maintenance modules', () => {
  assert.equal(checkFeatureAccess(null, member).status, 404);
  assert.equal(checkFeatureAccess({ ...activeFeature, enabled: false }, member).allowed, false);
  assert.equal(checkFeatureAccess({ ...activeFeature, implemented: false }, member).allowed, false);
  assert.equal(checkFeatureAccess({ ...activeFeature, maintenance: true }, member).allowed, false);
});

test('feature access enforces account roles and registered permissions', () => {
  assert.equal(
    checkFeatureAccess({ ...activeFeature, allowedRoles: ['employer'] }, member).allowed,
    false,
  );
  assert.equal(
    checkFeatureAccess({ ...activeFeature, requiredPermissions: ['jobs:manage'] }, member).allowed,
    false,
  );
  assert.equal(checkFeatureAccess(activeFeature, member).allowed, true);
  assert.equal(
    checkFeatureAccess(
      {
        ...activeFeature,
        allowedRoles: ['admin'],
        requiredPermissions: ['unknown:permission'],
      },
      { role: 'admin', userType: 'engineer' },
    ).allowed,
    true,
  );
});
