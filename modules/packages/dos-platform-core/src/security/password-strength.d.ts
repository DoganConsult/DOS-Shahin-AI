/**
 * zxcvbn-backed password-strength check.
 * Extracted from monolith platform/dos/security/services/password-strength.service.ts.
 *
 * Wraps zxcvbn so callers get a stable, typed surface instead of the library's
 * shape. If zxcvbn is not installed (dev build without deps), falls back to a
 * regex-derived conservative score and records a warning via console.
 */
export interface PasswordStrengthResult {
    score: 0 | 1 | 2 | 3 | 4;
    level: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
    crackTimeDisplay: string;
    feedback: string[];
    acceptable: boolean;
}
export declare function checkPasswordStrength(password: string, userInputs?: string[], minScore?: number): PasswordStrengthResult;
