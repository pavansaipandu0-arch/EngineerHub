import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, normalizeEmail, validatePassword, validateRegistration } from './auth.js';

test('normalizes email before validation', () => {
  assert.equal(normalizeEmail('  ENGINEER@example.com '), 'engineer@example.com');
  assert.equal(isValidEmail('engineer@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('requires a long password with mixed character types', () => {
  assert.equal(validatePassword('StrongPass123!'), null);
  assert.match(validatePassword('short'), /12 and 128/);
  assert.match(validatePassword('lowercasepassword123!'), /uppercase/);
  assert.match(validatePassword('Aa1!'.repeat(33)), /12 and 128/);
});

test('accepts a member profile without accepting a client supplied role', () => {
  const result = validateRegistration({
    name: 'Taylor Engineer',
    email: ' TAYLOR@example.com ',
    password: 'StrongPass123!',
    confirmPassword: 'StrongPass123!',
    branch: 'mechanical',
    userType: 'student',
    organization: 'Engineering College',
    role: 'admin',
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.email, 'taylor@example.com');
  assert.equal(result.value.userType, 'student');
  assert.equal('role' in result.value, false);
});

test('rejects invalid confirmation, branch, and user type', () => {
  const valid = {
    name: 'Taylor Engineer',
    email: 'taylor@example.com',
    password: 'StrongPass123!',
    confirmPassword: 'StrongPass123!',
    branch: 'mechanical',
    userType: 'student',
  };
  assert.equal(
    validateRegistration({ ...valid, confirmPassword: 'different' }).error,
    'Passwords do not match.',
  );
  assert.match(validateRegistration({ ...valid, branch: 'admin' }).error, /engineering branch/);
  assert.match(validateRegistration({ ...valid, userType: 'admin' }).error, /user type/);
});
