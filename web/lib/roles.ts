// Utility to determine user role based on email
export function getUserRole(email: string | undefined): 'owner' | 'employee' {
  if (!email) return 'employee';
  return email.endsWith('@admin.in') ? 'owner' : 'employee';
}
