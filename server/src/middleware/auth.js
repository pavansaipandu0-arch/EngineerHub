import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { checkFeatureAccess } from '../config/featureAccess.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.eh_access;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!payload.sid) return res.status(401).json({ message: 'Your session is no longer valid.' });
    const session = await Session.findOne({
      _id: payload.sid,
      userId: payload.sub,
      expiresAt: { $gt: new Date() },
    });
    if (!session)
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    const user = await User.findById(payload.sub).select(
      'name email role status emailVerifiedAt branch userType organization',
    );
    if (!user) return res.status(401).json({ message: 'Your session is no longer valid.' });
    if (user.status === 'suspended')
      return res.status(403).json({ message: 'This account has been suspended.' });
    if (user.status !== 'active' || !user.emailVerifiedAt) {
      return res
        .status(403)
        .json({ message: 'Verify your email address before using this account.' });
    }
    req.user = user;
    req.authSession = session;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }
    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'Administrator access required.' });
  return next();
}

export function requireEnabledFeature(key) {
  return async function featureGuard(req, res, next) {
    try {
      const Feature = (await import('../models/Feature.js')).default;
      const feature = await Feature.findOne({ key }).select(
        'implemented enabled maintenance availabilityMessage allowedRoles requiredPermissions',
      );
      const access = checkFeatureAccess(feature, req.user);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
