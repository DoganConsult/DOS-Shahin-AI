"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_POLICY_DESCRIPTION = exports.PASSWORD_RE = exports.PASSWORD_MAX_LENGTH = exports.PASSWORD_MIN_LENGTH = void 0;
exports.validatePassword = validatePassword;
exports.PASSWORD_MIN_LENGTH = 8;
exports.PASSWORD_MAX_LENGTH = 128;
exports.PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{8,128}$/;
exports.PASSWORD_POLICY_DESCRIPTION = 'Password must be 8–128 characters and include uppercase, lowercase, digit, and special character';
function validatePassword(password) {
    if (password.length < exports.PASSWORD_MIN_LENGTH) {
        return { valid: false, reason: `Password must be at least ${exports.PASSWORD_MIN_LENGTH} characters` };
    }
    if (password.length > exports.PASSWORD_MAX_LENGTH) {
        return { valid: false, reason: `Password must be at most ${exports.PASSWORD_MAX_LENGTH} characters` };
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
    if (!exports.PASSWORD_RE.test(password)) {
        return { valid: false, reason: 'Password contains disallowed characters' };
    }
    return { valid: true };
}
//# sourceMappingURL=password-policy.js.map