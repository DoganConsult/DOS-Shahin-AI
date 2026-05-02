export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{8,128}$/;

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, reason: `Password must be at most ${PASSWORD_MAX_LENGTH} characters` };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must include a lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must include an uppercase letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, reason: 'Password must include a digit' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return { valid: false, reason: 'Password must include a special character' };
  }
  if (!PASSWORD_RE.test(password)) {
    return { valid: false, reason: 'Password contains disallowed characters' };
  }
  return { valid: true };
}
