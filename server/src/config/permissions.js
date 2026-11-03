const MEMBER_PERMISSIONS = new Set([
  'community:access',
  'questions:access',
  'projects:access',
  'library:access',
  'tools:access',
  'profiles:access',
  'notifications:access',
  'events:access',
  'messaging:access',
  'ai:access',
  'quizzes:access',
  'showcase:access',
]);

const USER_TYPE_PERMISSIONS = {
  student: new Set(['learning:access', 'internships:access']),
  engineer: new Set(['research:access', 'jobs:access']),
  employer: new Set(['jobs:access', 'jobs:manage']),
};

export const FEATURE_PERMISSION_KEYS = [
  ...MEMBER_PERMISSIONS,
  'learning:access',
  'internships:access',
  'research:access',
  'jobs:access',
  'jobs:manage',
];

export function hasFeaturePermissions(user, requiredPermissions = []) {
  if (user?.role === 'admin') return true;
  const permissions = new Set(MEMBER_PERMISSIONS);
  for (const permission of USER_TYPE_PERMISSIONS[user?.userType] || []) {
    permissions.add(permission);
  }
  return requiredPermissions.every((permission) => permissions.has(permission));
}
