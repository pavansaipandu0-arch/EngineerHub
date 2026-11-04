import assert from 'node:assert/strict';
import test from 'node:test';
import { getAccountLabel, getUserHomePath, isStudentUser } from './authRouting.js';

test('routes students to their dashboard', () => {
  const student = { role: 'member', userType: 'student' };

  assert.equal(getUserHomePath(student), '/student-dashboard');
  assert.equal(getAccountLabel(student), 'Student');
  assert.equal(isStudentUser(student), true);
});

test('keeps admins and other account types on their existing home routes', () => {
  assert.equal(getUserHomePath({ role: 'admin', userType: 'engineer' }), '/admin');
  assert.equal(getAccountLabel({ role: 'admin' }), 'Administrator');
  assert.equal(getUserHomePath({ role: 'member', userType: 'engineer' }), '/workspace');
  assert.equal(getAccountLabel({ role: 'member', userType: 'employer' }), 'Employer');
  assert.equal(isStudentUser({ role: 'member', userType: 'engineer' }), false);
});
