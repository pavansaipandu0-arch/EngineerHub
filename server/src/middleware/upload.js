import multer from 'multer';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const documentTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]);

export function fileUpload({ allowedTypes, maxBytes = 5 * 1024 * 1024 }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter(req, file, done) {
      if (!allowedTypes.has(file.mimetype)) {
        const error = new Error('This file type is not permitted.');
        error.status = 415;
        return done(error);
      }
      return done(null, true);
    },
  }).single('file');
}

export const imageUpload = fileUpload({ allowedTypes: imageTypes });
export const resourceUpload = fileUpload({ allowedTypes: documentTypes, maxBytes: 20 * 1024 * 1024 });

export function validFileContent(file) {
  if (!file?.buffer?.length) return false;
  const name = file.originalname.toLowerCase();
  const mime = file.mimetype;
  if (mime === 'application/pdf') {
    return name.endsWith('.pdf') && file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  if (mime.startsWith('application/vnd.openxmlformats-officedocument.')) {
    return /\.(docx|xlsx|pptx)$/.test(name) && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b;
  }
  if (mime === 'text/plain') {
    return name.endsWith('.txt') && !file.buffer.includes(0);
  }
  if (mime === 'text/csv') {
    return name.endsWith('.csv') && !file.buffer.includes(0);
  }
  return false;
}

export function validImageContent(file) {
  if (!file?.buffer?.length) return false;
  const { buffer } = file;
  const name = file.originalname.toLowerCase();
  if (file.mimetype === 'image/jpeg') {
    return (name.endsWith('.jpg') || name.endsWith('.jpeg'))
      && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (file.mimetype === 'image/png') {
    return name.endsWith('.png')
      && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (file.mimetype === 'image/webp') {
    return name.endsWith('.webp')
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}
