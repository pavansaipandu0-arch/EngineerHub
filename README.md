# EngineerHub

EngineerHub is a responsive engineering collaboration platform for students and working engineers. It includes secure accounts, a personalized data-backed dashboard, engineer profiles, community discussions, engineering Q&A, collaborative projects, and a moderated knowledge library.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB 6.0+

## Setup

1. Install dependencies from the repository root:

   ```sh
   npm install
   ```

2. Copy `server/.env.example` to `server/.env`. Set `MONGODB_URI`, a unique random `JWT_SECRET` of at least 32 characters, and the frontend URL. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` with a real SMTP provider so verification and password-reset emails can be delivered. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to seed an administrator; use a unique password with at least 12 characters, uppercase/lowercase letters, a number, and a symbol.

3. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` for private document uploads and profile/community images. The credentials are read only by the API. Upload requests return an explicit service-unavailable error until storage is configured.

4. Start MongoDB, then create or update the administrator:

   ```sh
   npm run seed:admin
   ```

5. Start the API and frontend:

   ```sh
   npm run dev
   ```

   The frontend runs at `http://localhost:5173`; the public landing page is at `/`, registration and sign-in are at `/register` and `/login`, and the protected workspace is at `/workspace`. The API listens on `http://localhost:4000`.

The API starts its HTTP listener immediately and attempts the MongoDB connection in the background. `GET /api/health` reports the connection state and returns HTTP 503 until MongoDB is ready; the server retries an initial connection failure every five seconds. API routes that require persisted data return HTTP 503 while the database is unavailable.

## Production deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting configuration, managed MongoDB setup, secure environment variables, health checks, monitoring, backups, deployment verification, and rollback instructions. Netlify frontend and Render API configuration templates are included; provider accounts, domains, and secrets must be configured outside this repository.

For Netlify production builds, set `VITE_API_URL` to the real HTTPS API URL ending in `/api`; the production build intentionally fails if it is missing or still a placeholder. Registration requires a reachable MongoDB database and configured SMTP delivery for email verification. Check `/api/health/ready` and the API deployment logs if these services are unavailable.

## Initial capabilities

- Account registration, sign-in, session lookup, and sign-out.
- Email verification, verification-link resend, forgot-password, and single-use password reset flows.
- Passwords hashed with bcrypt; short-lived access JWTs and rotating random refresh tokens are held in `HttpOnly`, `SameSite=Strict` cookies. Refresh tokens are stored only as SHA-256 hashes in the session collection.
- Authenticated members can list and revoke sessions; password resets and account suspension revoke all existing sessions.
- Registration validates password confirmation, strength, email, engineering branch, account type, and optional organization. Student/Engineer/Employer are profile types, never authorization roles.
- Administrators can suspend or restore verified accounts. Suspended and unverified accounts cannot authenticate; the public registration API never assigns admin privileges.
- On the first database connection after this update, older accounts are migrated to pending email verification. Configure SMTP, then request a verification link from `/verify-email`; rerun `npm run seed:admin` to ensure the administrator account is active.
- Admin role is granted only by the explicit administrator seed command, never public registration.
- The member dashboard is populated from MongoDB records for projects, questions, community posts, approved resources, saved items, followed engineers, notifications, and activity. Job and event recommendations are empty until a real listing provider is connected.
- Profiles support education, certifications, work experience, skills, portfolio entries, external HTTPS links, profile visibility, photo upload, completion tracking, and engineer follow/unfollow.
- Community supports paginated/searchable posts, branch and tag filters, image posts, likes, comments and replies, bookmarks, editing/deletion by the author, share links, and reports.
- Engineering Q&A supports question search and filtering, supporting document uploads, answers and answer comments, one vote per user, best-answer selection, question following, bookmarks, related questions, and reports.
- Project Studio supports project visibility and ownership, member invitations and roles, invitation responses, task assignment and priorities, a four-column task board, deadlines, progress, comments, attachments, and activity history.
- The Knowledge Library accepts bounded document formats and sizes, stores private files in Cloudinary, requires submitters to confirm sharing rights, gates public discovery and downloads on administrator approval, and supports search, filters, bookmarks, PDF preview, and reviews.
- The Engineering Tools Center includes scientific, percentage, ratio, unit, temperature, length, mass, area, volume, and time calculators; number-system and data-size conversions; mechanical speed, pressure, torque, and power tools; civil geometry and basic concrete estimates; and electrical/electronics calculators. Calculations run locally in the browser, show formulas and limitations, and are not professional design or safety verification.
- Administrators have a centralized feature control center plus report and resource moderation queues. Feature configuration is stored in MongoDB; disabled navigation is hidden by default, configurable visible-disabled navigation displays the administrator's message, and backend feature middleware independently blocks unavailable APIs.
- The feature registry includes module implementation status, category, enabled/maintenance state, disabled-navigation visibility, availability messaging, allowed account roles, required permissions, and administrator/update metadata. Changes are audited, status history is pageable, and emergency disable is available. Modules without a completed implementation remain disabled and cannot be enabled; configuration changes do not delete user data. Audited setting changes use MongoDB transactions, so use a replica-set deployment for local and production MongoDB.
- Upload storage is private/authenticated; the API validates file size, MIME type, filename extension, and file signatures before storing. Resources use short-lived signed download links.
- Admin endpoints enforce authentication and role checks; auth requests are rate limited and state-changing requests validate their origin.
- Shared accessible controls include buttons, form fields, dropdowns, dialogs, tables, tabs, badges, search, pagination, loading/empty/error states, and toast notifications.
- Light and dark themes are available on sign-in and workspace screens; the choice persists in the browser.
- The public landing page fetches enabled module names and descriptions from `GET /api/features/public`. This endpoint exposes no user or administrator data.
- No testimonials are published because the application does not currently have verified testimonial records.

## Workspace routes

- `/workspace` — personalized dashboard and feature control center for administrators.
- `/profile` and `/engineers/:userId` — own and public engineer profiles.
- `/engineers` — searchable public engineer directory.
- `/community` — community feed and post creation.
- `/questions` and `/questions/:questionId` — engineering Q&A.
- `/projects` and `/projects/:projectId` — projects, invitations, tasks, files, and collaboration.
- `/library` — approved resources, uploads, review status, downloads, and reviews.
- `/tools` — engineering calculators, unit converters, formula explanations, assumptions, and session-only calculation history.
- `/notifications` — account-specific notifications.
- `/admin/moderation` — administrator report and resource review queues.
- `GET /api/features/active` — active, implemented modules available to public discovery.
- `GET /api/admin/features/history` — paginated administrator feature-setting audit history.

File uploads require a configured Cloudinary account. Email verification and password-reset delivery require SMTP. MongoDB must be running for all persisted workflows. The automated test suite covers authentication validators, request helpers, and file signature checks; database-backed flows still require a configured MongoDB and mail/storage services for full end-to-end verification.
