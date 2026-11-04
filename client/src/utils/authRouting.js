export function getUserHomePath(user) {
  if (user?.role === 'admin') return '/admin';
  if (user?.userType === 'student') return '/student-dashboard';
  return '/workspace';
}

export function isStudentUser(user) {
  return user?.role !== 'admin' && user?.userType === 'student';
}

export function getAccountLabel(user) {
  if (user?.role === 'admin') return 'Administrator';
  if (user?.userType === 'student') return 'Student';
  if (user?.userType === 'engineer') return 'Engineer';
  if (user?.userType === 'employer') return 'Employer';
  return 'Member';
}
