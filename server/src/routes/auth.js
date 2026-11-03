import { randomBytes, createHash } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email.js';
import {
  validatePassword,
  validateRegistration,
  isValidEmail,
  normalizeEmail,
} from '../validators/auth.js';

const router = Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_LIFETIME_MS = 30 * DAY_MS;
const VERIFY_LIFETIME_MS = DAY_MS;
const RESET_LIFETIME_MS = 60 * 60 * 1000;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please wait and try again.' },
});
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many email requests. Please wait before trying again.' },
});
const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 15 * 60 * 1000,
};
const refreshCookieOptions = {
  ...accessCookieOptions,
  path: '/api/auth',
  maxAge: SESSION_LIFETIME_MS,
};

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    branch: user.branch,
    userType: user.userType,
    organization: user.organization,
  };
}

function clearSessionCookies(res) {
  res.clearCookie('eh_access', { ...accessCookieOptions, maxAge: undefined });
  res.clearCookie('eh_refresh', { ...refreshCookieOptions, maxAge: undefined });
}

async function createSession(user, req, res) {
  const rawRefreshToken = randomBytes(48).toString('base64url');
  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: hashToken(rawRefreshToken),
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    userAgent: req.get('user-agent')?.slice(0, 300) || '',
  });
  const accessToken = jwt.sign({ sub: user.id, sid: session.id }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });
  res.cookie('eh_access', accessToken, accessCookieOptions);
  res.cookie('eh_refresh', rawRefreshToken, refreshCookieOptions);
  return session;
}

async function createEmailToken(user, field, expiryField, lifetime) {
  const token = randomBytes(32).toString('base64url');
  user[field] = hashToken(token);
  user[expiryField] = new Date(Date.now() + lifetime);
  await user.save();
  return token;
}

function invalidLink(res) {
  return res
    .status(400)
    .json({ message: 'This link is invalid or has expired. Request a new one and try again.' });
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const result = validateRegistration(req.body);
    if (result.error) return res.status(400).json({ message: result.error });

    const { name, email, password, branch, userType, organization } = result.value;
    const existing = await User.exists({ email });
    if (existing)
      return res.status(409).json({ message: 'An account with that email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      branch,
      userType,
      organization,
      status: 'pending_verification',
    });
    const token = await createEmailToken(
      user,
      'emailVerificationTokenHash',
      'emailVerificationExpiresAt',
      VERIFY_LIFETIME_MS,
    );
    try {
      await sendVerificationEmail(user, token);
    } catch (error) {
      console.error('Verification email delivery failed:', error);
      return res.status(error.status || 503).json({
        code: 'VERIFICATION_EMAIL_FAILED',
        message:
          'Your account was created, but the verification email could not be sent. Check email settings and request a new link.',
      });
    }
    return res.status(201).json({
      message: 'Account created. Check your email for a verification link before signing in.',
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = normalizeEmail(body.email);
    const { password } = body;
    if (!isValidEmail(email) || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ message: 'Enter a valid email address and password.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    if (user.status === 'suspended') {
      return res
        .status(403)
        .json({ message: 'This account has been suspended. Contact support for assistance.' });
    }
    if (user.status !== 'active' || !user.emailVerifiedAt) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email address before signing in.',
      });
    }

    await createSession(user, req, res);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const rawToken = req.cookies?.eh_refresh;
    if (!rawToken) return res.status(401).json({ message: 'A valid session is required.' });
    const session = await Session.findOneAndDelete({
      refreshTokenHash: hashToken(rawToken),
      expiresAt: { $gt: new Date() },
    });
    if (!session) {
      clearSessionCookies(res);
      return res.status(401).json({ message: 'Your session expired. Please sign in again.' });
    }

    const user = await User.findById(session.userId);
    if (!user || user.status !== 'active' || !user.emailVerifiedAt) {
      await Session.deleteMany({ userId: session.userId });
      clearSessionCookies(res);
      return res.status(401).json({ message: 'This account cannot start a session.' });
    }

    await createSession(user, req, res);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/email/verify', emailLimiter, async (req, res, next) => {
  try {
    const token = req.body?.token;
    if (typeof token !== 'string' || token.length < 20 || token.length > 200)
      return invalidLink(res);
    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select('+emailVerificationTokenHash');
    if (!user || user.status === 'suspended') return invalidLink(res);

    user.emailVerifiedAt = new Date();
    user.status = 'active';
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();
    await createSession(user, req, res);
    return res.json({ user: publicUser(user), message: 'Email verified. Your account is ready.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/email/verification/resend', emailLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email))
      return res.status(400).json({ message: 'Enter a valid email address.' });
    const user = await User.findOne({ email, status: 'pending_verification' });
    if (user) {
      const token = await createEmailToken(
        user,
        'emailVerificationTokenHash',
        'emailVerificationExpiresAt',
        VERIFY_LIFETIME_MS,
      );
      await sendVerificationEmail(user, token);
    }
    return res.json({ message: 'If that account needs verification, a new link has been sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/password/forgot', emailLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email))
      return res.status(400).json({ message: 'Enter a valid email address.' });
    const user = await User.findOne({ email, status: 'active' });
    if (user) {
      const token = await createEmailToken(
        user,
        'passwordResetTokenHash',
        'passwordResetExpiresAt',
        RESET_LIFETIME_MS,
      );
      await sendPasswordResetEmail(user, token);
    }
    return res.json({
      message:
        'If an active account matches that email, password reset instructions have been sent.',
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/password/reset', authLimiter, async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (typeof token !== 'string' || token.length < 20 || token.length > 200)
      return invalidLink(res);
    if (password !== confirmPassword)
      return res.status(400).json({ message: 'Passwords do not match.' });
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });

    const newPasswordHash = await bcrypt.hash(password, 12);
    const user = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: { $gt: new Date() },
        status: 'active',
      },
      {
        $set: { passwordHash: newPasswordHash },
        $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!user) return invalidLink(res);

    await Session.deleteMany({ userId: user._id });
    clearSessionCookies(res);
    return res.json({ message: 'Your password has been reset. Sign in with your new password.' });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .select('createdAt expiresAt userAgent')
      .lean();
    return res.json({
      sessions: sessions.map((session) => ({
        id: session._id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent,
        current: session._id.toString() === req.authSession.id,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/sessions/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await Session.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Session not found.' });
    if (deleted.id === req.authSession.id) clearSessionCookies(res);
    return res.status(204).end();
  } catch (error) {
    if (error.name === 'CastError')
      return res.status(400).json({ message: 'Invalid session identifier.' });
    return next(error);
  }
});

router.delete('/sessions', requireAuth, async (req, res, next) => {
  try {
    await Session.deleteMany({ userId: req.user._id });
    clearSessionCookies(res);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.eh_refresh;
    if (token) await Session.deleteOne({ refreshTokenHash: hashToken(token) });
    clearSessionCookies(res);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
