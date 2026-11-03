export function isJsonContentType(contentType = '') {
  const normalized = contentType.toLowerCase();
  return normalized.includes('/json') || normalized.includes('+json');
}

export function isValidApiResponse({ status, contentType, responseType }) {
  return (
    status === 204 || status === 205 || responseType === 'blob' || isJsonContentType(contentType)
  );
}
