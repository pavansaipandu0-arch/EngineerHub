import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env'),
});
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import {
  closeDatabase,
  connectDatabase,
  databaseOptions,
  getDatabaseStatus,
  stopDatabaseRetries,
} from './config/database.js';
import authRouter from './routes/auth.js';
import featuresRouter from './routes/features.js';
import adminRouter from './routes/admin.js';
import dashboardRouter from './routes/dashboard.js';
import profilesRouter from './routes/profiles.js';
import communityRouter from './routes/community.js';
import questionsRouter from './routes/questions.js';
import projectsRouter from './routes/projects.js';
import resourcesRouter from './routes/resources.js';
import socialRouter from './routes/social.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { log } from './utils/logger.js';
import { createGracefulShutdown } from './utils/shutdown.js';
import 'dotenv/config';
import * as dns from 'node:dns';

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const requiredEnvironment = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
for (const key of requiredEnvironment) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.JWT_SECRET.length < 32)
  throw new Error('JWT_SECRET must be at least 32 characters long.');
databaseOptions();

const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = new URL(process.env.FRONTEND_URL);
if (isProduction && frontendUrl.protocol !== 'https:') {
  throw new Error('FRONTEND_URL must use HTTPS in production.');
}

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || frontendUrl.origin)
    .split(',')
    .map((origin) => new URL(origin.trim()).origin),
);
if (!allowedOrigins.has(frontendUrl.origin)) {
  throw new Error('CORS_ORIGINS must include the origin of FRONTEND_URL.');
}
if (isProduction && [...allowedOrigins].some((origin) => new URL(origin).protocol !== 'https:')) {
  throw new Error('CORS_ORIGINS must contain only HTTPS origins in production.');
}

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
}

const app = express();
const port = Number(process.env.PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

app.disable('x-powered-by');
if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);
app.use(helmet());
app.use((req, res, next) => {
  const requestId = randomUUID();
  const start = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    log('info', 'http_request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
    });
  });
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);
app.use((req, res, next) => {
  if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  return next();
});
app.use(express.json({ limit: '128kb' }));
app.use(cookieParser());

app.get('/api/health/live', (req, res) => res.status(200).json({ status: 'ok' }));
app.get(['/api/health', '/api/health/ready'], (req, res) => {
  const database = getDatabaseStatus();
  const healthy = database === 'connected';
  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'unavailable',
    database,
  });
});
app.use('/api', (req, res, next) => {
  if (getDatabaseStatus() !== 'connected') {
    return res.status(503).json({ message: 'The database is temporarily unavailable.' });
  }
  return next();
});
app.use('/api/auth', authRouter);
app.use('/api/features', featuresRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profilesRouter);
app.use('/api/community', communityRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api', socialRouter);
app.use(notFound);
app.use(errorHandler);

const server = createServer(app);
server.listen(port, () => {
  log('info', 'server_started', { port, environment: process.env.NODE_ENV || 'development' });
  connectDatabase();
});

const shutdown = createGracefulShutdown({
  server,
  stopDatabaseRetries,
  closeDatabase,
  log,
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
