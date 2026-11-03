import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedText, pagination, safeUrl, validTags } from './http.js';

test('pagination constrains page size and rejects negative input', () => {
  assert.deepEqual(pagination({ page: '-2', limit: '1000' }), {
    page: 1,
    limit: 50,
    skip: 0,
  });
  assert.deepEqual(pagination({ page: '3', limit: '10' }), {
    page: 3,
    limit: 10,
    skip: 20,
  });
});

test('text and tag validation normalizes input and enforces limits', () => {
  assert.equal(boundedText('  CAD  ', 10, 'Name', { required: true }), 'CAD');
  assert.deepEqual(validTags(['CAD', 'cad', 'Finite Element']), ['cad', 'finite element']);
  assert.throws(() => validTags(Array.from({ length: 11 }, (_, index) => `tag${index}`)), {
    status: 400,
  });
  assert.throws(() => boundedText('', 10, 'Name', { required: true }), { status: 400 });
});

test('external profile URLs require HTTPS', () => {
  assert.equal(safeUrl('https://example.com/profile', 'Website'), 'https://example.com/profile');
  assert.throws(() => safeUrl('javascript:alert(1)', 'Website'), { status: 400 });
});
