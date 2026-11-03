import test from 'node:test';
import assert from 'node:assert/strict';
import { isJsonContentType, isValidApiResponse } from './apiResponse.js';

test('recognizes JSON API content types', () => {
  assert.equal(isJsonContentType('application/json; charset=utf-8'), true);
  assert.equal(isJsonContentType('application/problem+json'), true);
});

test('rejects HTML fallback and missing API content types', () => {
  assert.equal(isJsonContentType('text/html; charset=utf-8'), false);
  assert.equal(isJsonContentType(''), false);
});

test('accepts empty success responses and authorized binary downloads', () => {
  assert.equal(isValidApiResponse({ status: 204, contentType: '' }), true);
  assert.equal(isValidApiResponse({ status: 205, contentType: '' }), true);
  assert.equal(isValidApiResponse({ status: 200, contentType: '', responseType: 'blob' }), true);
});

test('rejects non-JSON API responses that are not empty or binary successes', () => {
  assert.equal(isValidApiResponse({ status: 200, contentType: 'text/html' }), false);
});
