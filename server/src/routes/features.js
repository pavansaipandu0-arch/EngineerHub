import { Router } from 'express';
import Feature from '../models/Feature.js';
import { requireAuth } from '../middleware/auth.js';
import { PRODUCT_FEATURE_KEYS } from '../config/features.js';
import { hasFeaturePermissions } from '../config/permissions.js';

const router = Router();

router.get('/public', async (req, res, next) => {
  try {
    const features = await Feature.find({
      enabled: true,
      implemented: true,
      maintenance: false,
      key: { $in: PRODUCT_FEATURE_KEYS },
    })
      .select('-_id key name description')
      .sort({ name: 1 })
      .lean();
    return res.json({ features });
  } catch (error) {
    return next(error);
  }
});

router.get('/active', async (req, res, next) => {
  try {
    const features = await Feature.find({
      enabled: true,
      implemented: true,
      maintenance: false,
      key: { $in: PRODUCT_FEATURE_KEYS },
    })
      .select('-_id key name description category')
      .sort({ name: 1 })
      .lean();
    return res.json({ features });
  } catch (error) {
    return next(error);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const storedFeatures = await Feature.find({ key: { $in: PRODUCT_FEATURE_KEYS } })
      .select(
        'key name description category implemented enabled showWhenDisabled maintenance availabilityMessage allowedRoles requiredPermissions updatedAt updatedBy',
      )
      .populate('updatedBy', 'name')
      .sort({ name: 1 })
      .lean();
    const roles = [req.user.role, req.user.userType];
    const features = storedFeatures.map((feature) => ({
      ...feature,
      accessAllowed:
        feature.allowedRoles.some((role) => roles.includes(role)) &&
        hasFeaturePermissions(req.user, feature.requiredPermissions),
    }));
    return res.json({ features });
  } catch (error) {
    return next(error);
  }
});

export default router;
