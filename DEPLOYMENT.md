# EngineerHub production deployment

This repository includes a Netlify static-site configuration (`netlify.toml`) and a Render Node API blueprint (`render.yaml`). Use equivalent providers if desired. Neither provider manifest contains credentials. Production domains, managed service accounts, TLS certificates, API keys, and monitoring/backup policies must be configured in their respective provider dashboards.

## Architecture and domains

Use a static frontend origin and API origin on the **same registrable domain**, for example:

- Frontend: `https://app.example.com`
- API: `https://api.example.com`

The authentication cookies are `Secure`, `HttpOnly`, and `SameSite=Strict` in production. Hosting the frontend and API on unrelated domains can cause browsers to reject or omit authentication cookies. Provision HTTPS for both domains and keep the API private to the frontend where practical.

## Pre-deployment checklist

- [ ] Choose production frontend and API host accounts/regions. Create `app.example.com` and `api.example.com` DNS records; enable HTTPS and automatic certificate renewal.
- [ ] Create a production MongoDB Atlas (or equivalent managed replica-set) cluster. Create a dedicated least-privilege application database user, restrict network access to the API host's static egress IPs or private network, and use TLS. Do not use an unrestricted `0.0.0.0/0` rule.
- [ ] Set a strong unique database password and URL-encode reserved characters in `MONGODB_URI`. Store the complete connection string only in the API host's secret manager.
- [ ] Configure scheduled managed-database backups, retention, point-in-time recovery where available, and alerting. Perform a restore drill into a separate staging cluster before launch.
- [ ] Generate a unique `JWT_SECRET` of at least 32 characters. Keep administrator and database credentials separate; never commit production values.
- [ ] Create production Cloudinary credentials with private/authenticated delivery and suitable upload limits. Set its credentials only on the API.
- [ ] Configure a real SMTP provider, verified sender/domain, SPF, DKIM, and DMARC. Test verification and password-reset delivery.
- [ ] Review supported features and seed a verified administrator using `npm run seed:admin` after configuring `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the API environment.
- [ ] Confirm the release is backed up and a previous frontend and API deployment is available for rollback.

## Configure and deploy

### 1. Configure the API (Render example)

Create a Render web service from this repository and use the included `render.yaml` blueprint. It sets:

- Build: `npm ci && npm run check -w server`
- Start: `npm run start -w server`
- Readiness probe: `/api/health/ready`

In the service's **secret environment-variable settings**, provide:

| Variable                                                               | Value                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `MONGODB_URI`                                                          | Managed TLS MongoDB URI for the production database                     |
| `JWT_SECRET`                                                           | Unique random secret, at least 32 characters                            |
| `FRONTEND_URL`                                                         | Canonical frontend URL, e.g. `https://app.example.com`                  |
| `CORS_ORIGINS`                                                         | Comma-separated exact HTTPS frontend origins, including any `www` alias |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                        | Unique administrator credentials; never use sample values               |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`                | Production email provider settings                                      |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Production private file-storage credentials                             |

`NODE_ENV=production` and `TRUST_PROXY_HOPS=1` are set by the blueprint. Set the proxy hop count to match the actual trusted reverse-proxy topology; do not trust arbitrary client-supplied forwarding headers. Keep database pool sizes at the defaults unless traffic and cluster capacity have been measured.

Copy `server/.env.example` only as a **variable-name reference**, not as deployable credentials. The application rejects non-HTTPS frontend/CORS origins in production and enables MongoDB TLS, disables automatic index creation, and emits structured JSON logs to stdout/stderr.

### 2. Create and verify production indexes

Before taking production traffic, run the index command once using the production API environment and a controlled maintenance/release window:

```sh
npm run db:indexes -w server
```

This builds the indexes declared by the Mongoose models. Unique indexes can fail if existing data contains duplicates; resolve those conflicts deliberately and rerun. Do not drop production indexes or collections as a shortcut. Re-run the command after deploying model changes that add indexes.

Check database connectivity from the API environment:

```sh
npm run db:check -w server
```

This runs an authenticated database ping and exits nonzero on failure. A real production connectivity check requires valid provider secrets and network access, and must be run from the deployed API environment (not a developer workstation without an approved IP rule).

Feature-control audit operations use MongoDB transactions, so use a managed replica set, not a standalone server.

### 3. Configure and deploy the frontend (Netlify example)

Create a Netlify site from the repository root using the included `netlify.toml`:

- Build command: `npm run build:production`
- Publish directory: `client/dist`
- SPA fallback: all frontend paths rewrite to `index.html`
- Static assets: immutable one-year cache headers

Set the site build environment variable **before the first production build**:

```text
VITE_API_URL=https://api.your-domain.com/api
```

The value is public and embedded in the JavaScript bundle; it must never contain a secret. The production build fails unless this is a real HTTPS API URL ending in `/api`; the development build keeps `/api` as a same-origin fallback. `client/.env.example` documents the variable. Rebuild and redeploy whenever it changes.

Configure the frontend custom domain in Netlify and enable managed HTTPS. Add every frontend origin serving the app to `CORS_ORIGINS`; `FRONTEND_URL` is also used to generate account email links. Configure matching DNS and certificate settings for the API domain in its host.

### Troubleshooting module loading and registration

- If `/api/health/ready` returns 503, check the API service logs and MongoDB Atlas URI, database user, TLS/network allowlist, and cluster status. Module listing, registration, and other data routes require a connected database.
- If an API request returns the frontend HTML page, `VITE_API_URL` is missing or points to the frontend host. Set the real API URL in the frontend provider's build environment and redeploy. The production build now rejects missing and placeholder API URLs; the browser also rejects HTML responses instead of treating them as successful API calls.
- If API requests fail in the browser, verify the API host is up and `FRONTEND_URL`/`CORS_ORIGINS` exactly match the frontend's HTTPS origin.
- If account registration reports that verification email could not be sent, the account was already created in pending-verification state. Configure SMTP on the API, then use **Resend verification email** instead of registering the same email again.

## Security, logging, monitoring, and storage

- The API applies Helmet, exact-origin credentialed CORS, request-origin rejection, request IDs, bounded JSON bodies, and secure auth cookies. Do not set wildcard origins with credentials.
- API request/error and MongoDB lifecycle logs are structured JSON and avoid request query strings and credentials. Retain deployment logs in the host's log service, restrict access, and configure alerts for repeated 5xx responses, startup failures, and database disconnects. Do not enable secret/environment dumps.
- Configure an external uptime monitor for `https://api.example.com/api/health/live` and `https://api.example.com/api/health/ready`. Alert on non-2xx results. Liveness only checks the process; readiness checks MongoDB.
- Configure the host's error-monitoring integration (or an approved error-monitoring provider) for API exceptions and frontend JavaScript errors. Set source-map upload/release settings only in the provider's secret store if enabled; production frontend source maps are not published by the build. Verify alerts with a controlled staging error. An external monitoring account/DSN is not included in this repository.
- Cloudinary uploads use authenticated private storage and short-lived signed resource downloads. Verify production privacy/access settings and retention policies in Cloudinary before accepting uploads.
- Configure the SMTP provider's delivery/bounce logs and alerts. Exercise email verification and password reset with production-like test accounts.
- Review CSP and other static-site security headers against any added third-party assets before broadening them. Keep host and app TLS enforcement enabled.

## Build and release verification

Run before deployment:

```sh
npm ci
npm test
npm run lint
npm run build
```

After both services deploy, run this read-only smoke check from a network that can reach them:

```sh
npm run deploy:smoke -- https://app.example.com https://api.example.com
```

It verifies frontend `/` and `/login` (including SPA fallback), API liveness, and API readiness/MongoDB. Readiness is counted as a pass only when MongoDB is connected. It does not create accounts or verify authenticated workflows; exercise registration, login/logout, email, uploads, and one representative read/write flow with dedicated test accounts before announcing launch.

Do not report a live deployment as verified until the command succeeds against the actual production URLs. No production URLs or provider credentials are supplied in this repository.

## Rollback

1. If health checks fail, pause rollout/traffic promotion. Capture deployment IDs, timestamps, request IDs, and sanitized logs; do not copy secrets into tickets.
2. Roll back the API and frontend to their last known-good deployments using the hosting providers' deployment history. Restore the previous frontend `VITE_API_URL` if the API endpoint changed, then rebuild/redeploy the frontend.
3. If a database migration or release caused data loss/corruption, stop writes and restore the managed backup/PITR snapshot to a separate cluster first. Validate it and update the API secret URI during a controlled cutover. Avoid overwriting the only current database copy.
4. Schema/index additions should be backward-compatible. The index command creates declared indexes but does not roll back schema changes; do not drop indexes/collections as routine rollback.
5. Re-run `/api/health/live`, `/api/health/ready`, the deployment smoke command, and the agreed critical user flows. Keep the affected release disabled until checks pass.
