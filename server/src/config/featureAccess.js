import { hasFeaturePermissions } from './permissions.js';

export function checkFeatureAccess(feature, user) {
  if (!feature) {
    return { allowed: false, status: 404, message: 'This module is not configured.' };
  }
  if (!feature.implemented || !feature.enabled || feature.maintenance) {
    return {
      allowed: false,
      status: 403,
      message: feature.availabilityMessage || 'This module is unavailable.',
    };
  }
  const userRoles = [user?.role, user?.userType];
  if (!feature.allowedRoles?.some((role) => userRoles.includes(role))) {
    return {
      allowed: false,
      status: 403,
      message: 'Your account role cannot access this module.',
    };
  }
  if (!hasFeaturePermissions(user, feature.requiredPermissions || [])) {
    return {
      allowed: false,
      status: 403,
      message: 'You do not have permission to access this module.',
    };
  }
  return { allowed: true, status: 200, message: '' };
}
