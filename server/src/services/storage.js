import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';
import { httpError } from '../utils/http.js';

function configured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw httpError(503, 'File storage is not configured. Contact the administrator.');
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadBuffer(buffer, { folder, resourceType, format, access = 'upload' }) {
  configured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `engineerhub/${folder}`,
      resource_type: resourceType,
      type: access,
      format,
      overwrite: false,
      unique_filename: true,
      use_filename: false,
    }, (error, result) => {
      if (error) return reject(httpError(502, 'The file could not be stored securely.'));
      return resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

export async function deleteStoredFile(publicId, resourceType) {
  configured();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: 'authenticated' });
}

export function signedResourceDownload(publicId, format, resourceType = 'raw', attachment = true) {
  configured();
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment,
  });
}

export function signedImageUrl(publicId) {
  configured();
  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: 'authenticated',
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
}
