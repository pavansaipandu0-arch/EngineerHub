import { httpError } from './http.js';
import { FEATURE_PERMISSION_KEYS } from '../config/permissions.js';

const editableFields = new Set([
  'enabled',
  'showWhenDisabled',
  'maintenance',
  'availabilityMessage',
  'allowedRoles',
  'requiredPermissions',
]);
const validRoles = new Set(['member', 'admin', 'student', 'engineer', 'employer']);
const validPermissions = new Set(FEATURE_PERMISSION_KEYS);

export function validateFeatureUpdates(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Provide feature settings to update.');
  }
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !editableFields.has(key))) {
    throw httpError(400, 'Provide only supported feature settings.');
  }

  const updates = {};
  for (const field of ['enabled', 'showWhenDisabled', 'maintenance']) {
    if (field in body) {
      if (typeof body[field] !== 'boolean') throw httpError(400, `${field} must be a boolean.`);
      updates[field] = body[field];
    }
  }
  if ('availabilityMessage' in body) {
    if (typeof body.availabilityMessage !== 'string') {
      throw httpError(400, 'Availability message must be text.');
    }
    const message = body.availabilityMessage.trim();
    if (!message || message.length > 180) {
      throw httpError(400, 'Availability message must be between 1 and 180 characters.');
    }
    updates.availabilityMessage = message;
  }
  if ('allowedRoles' in body) {
    if (
      !Array.isArray(body.allowedRoles) ||
      body.allowedRoles.length === 0 ||
      body.allowedRoles.length > validRoles.size ||
      body.allowedRoles.some((role) => !validRoles.has(role))
    ) {
      throw httpError(400, 'Choose one or more valid account roles.');
    }
    updates.allowedRoles = [...new Set(body.allowedRoles.map((role) => role.trim()))];
  }
  if ('requiredPermissions' in body) {
    if (
      !Array.isArray(body.requiredPermissions) ||
      body.requiredPermissions.length > 20 ||
      body.requiredPermissions.some(
        (permission) => typeof permission !== 'string' || !validPermissions.has(permission),
      )
    ) {
      throw httpError(400, 'Provide up to 20 registered permission identifiers.');
    }
    updates.requiredPermissions = [...new Set(body.requiredPermissions)];
  }
  return updates;
}
