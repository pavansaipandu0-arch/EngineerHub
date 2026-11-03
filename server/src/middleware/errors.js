import { log } from '../utils/logger.js';

export function notFound(req, res) {
  res.status(404).json({ message: 'The requested resource was not found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Please check the submitted information.' });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'A submitted identifier or value is invalid.' });
  }
  if (error.name === 'MulterError') {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'The file exceeds the upload size limit.'
          : 'The uploaded file could not be processed.',
    });
  }
  if (error.code === 11000) return res.status(409).json({ message: 'This record already exists.' });
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ message: 'Request body must be valid JSON.' });

  log('error', 'request_failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    name: error.name,
  });
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
}
