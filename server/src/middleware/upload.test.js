import test from 'node:test';
import assert from 'node:assert/strict';
import { validFileContent, validImageContent } from './upload.js';

test('upload signature checks reject MIME and extension mismatches', () => {
  const pdf = { originalname: 'notes.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7 document') };
  assert.equal(validFileContent(pdf), true);
  assert.equal(validFileContent({ ...pdf, originalname: 'notes.exe' }), false);
  assert.equal(validFileContent({ ...pdf, buffer: Buffer.from('not a PDF') }), false);
});

test('upload signature checks accept safe image signatures only', () => {
  const png = {
    originalname: 'diagram.png',
    mimetype: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]),
  };
  assert.equal(validImageContent(png), true);
  assert.equal(validImageContent({ ...png, originalname: 'diagram.jpg' }), false);
});
