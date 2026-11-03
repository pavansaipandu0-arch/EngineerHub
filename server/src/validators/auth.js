export const USER_TYPES = ['student', 'engineer', 'employer'];
export const ENGINEERING_BRANCHES = [
  'aerospace',
  'biomedical',
  'chemical',
  'civil',
  'computer',
  'electrical',
  'environmental',
  'industrial',
  'materials',
  'mechanical',
  'other',
];

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return 'Use a password between 12 and 128 characters.';
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return 'Use at least one uppercase letter, lowercase letter, number, and symbol.';
  }
  return null;
}

export function validateRegistration(body = {}) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = normalizeEmail(input.email);
  const passwordError = validatePassword(input.password);
  if (name.length < 2 || name.length > 80)
    return { error: 'Name must be between 2 and 80 characters.' };
  if (!isValidEmail(email)) return { error: 'Enter a valid email address.' };
  if (input.password !== input.confirmPassword) return { error: 'Passwords do not match.' };
  if (passwordError) return { error: passwordError };
  if (!ENGINEERING_BRANCHES.includes(input.branch)) {
    return { error: 'Choose a valid engineering branch.' };
  }
  if (!USER_TYPES.includes(input.userType)) return { error: 'Choose a valid user type.' };
  const organization = typeof input.organization === 'string' ? input.organization.trim() : '';
  if (organization.length > 120) {
    return { error: 'College or organization must be 120 characters or fewer.' };
  }
  return {
    value: {
      name,
      email,
      password: input.password,
      branch: input.branch,
      userType: input.userType,
      organization,
    },
  };
}
