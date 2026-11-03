const [frontendInput, apiInput, ...extraArgs] = process.argv.slice(2);
if (!frontendInput || !apiInput || extraArgs.length) {
  console.error('Usage: npm run deploy:smoke -- <frontend-https-url> <api-https-origin>');
  process.exit(2);
}

function parseHttpsUrl(input, label) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS.`);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error(`${label} must be a clean HTTPS origin without credentials or a path.`);
    }
    return url;
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

const frontend = parseHttpsUrl(frontendInput, 'Frontend URL');
const api = parseHttpsUrl(apiInput, 'API origin');
const checks = [
  ['frontend home', new URL('/', frontend), 'html'],
  ['frontend SPA route', new URL('/login', frontend), 'html'],
  ['API liveness', new URL('/api/health/live', api), 'live'],
  ['API readiness', new URL('/api/health/ready', api), 'ready'],
];

let failures = 0;
for (const [label, url, expected] of checks) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const contentType = response.headers.get('content-type') || '';
    const body = expected === 'html' ? await response.text() : await response.json();
    const passed =
      response.status === 200 &&
      (expected === 'html'
        ? contentType.includes('text/html') && body.includes('<div id="root">')
        : expected === 'live'
          ? body.status === 'ok'
          : body.status === 'ok' && body.database === 'connected');

    console.log(
      JSON.stringify({
        check: label,
        status: response.status,
        result: passed ? 'passed' : 'failed',
      }),
    );
    if (!passed) failures += 1;
  } catch (error) {
    console.error(JSON.stringify({ check: label, result: 'failed', error: error.name }));
    failures += 1;
  }
}

if (failures) process.exitCode = 1;
