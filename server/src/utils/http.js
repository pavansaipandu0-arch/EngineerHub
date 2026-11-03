export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedResponse(page, limit, total) {
  return { page, limit, total, pageCount: Math.ceil(total / limit) };
}

export function boundedText(value, maxLength, field, { required = false } = {}) {
  if (typeof value !== 'string') {
    if (required) throw httpError(400, `${field} is required.`);
    return '';
  }
  const text = value.trim();
  if (required && !text) throw httpError(400, `${field} is required.`);
  if (text.length > maxLength) throw httpError(400, `${field} must be ${maxLength} characters or fewer.`);
  return text;
}

export function validTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) throw httpError(400, 'Provide no more than 10 tags.');
  return [...new Set(value.map((tag) => boundedText(tag, 30, 'Tag').toLowerCase()).filter(Boolean))];
}

export function safeUrl(value, field) {
  if (!value) return '';
  const text = boundedText(value, 500, field);
  let url;
  try {
    url = new URL(text);
  } catch {
    throw httpError(400, `${field} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== 'https:') throw httpError(400, `${field} must be a valid HTTPS URL.`);
  return url.toString();
}
