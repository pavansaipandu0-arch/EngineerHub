const apiUrl = process.env.VITE_API_URL;

if (!apiUrl) {
  console.error(
    'VITE_API_URL is required for a production frontend build. Set it to the deployed HTTPS API origin ending in /api.',
  );
  process.exit(1);
}

try {
  const parsedUrl = new URL(apiUrl);
  const hostname = parsedUrl.hostname.toLowerCase();
  const placeholderHost =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.example') ||
    hostname === 'example.com' ||
    hostname.endsWith('.example.com') ||
    hostname === 'your-domain.com' ||
    hostname.endsWith('.your-domain.com') ||
    hostname.endsWith('.invalid') ||
    hostname.endsWith('.test');
  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.pathname.replace(/\/+$/, '') !== '/api' ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.username ||
    parsedUrl.password ||
    placeholderHost
  ) {
    throw new Error();
  }
} catch {
  console.error(
    'VITE_API_URL must be a real HTTPS API URL ending in /api, for example https://api.your-domain.com/api.',
  );
  process.exit(1);
}

console.log('Production API URL is configured.');
