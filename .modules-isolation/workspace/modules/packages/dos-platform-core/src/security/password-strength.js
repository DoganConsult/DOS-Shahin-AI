"use strict";
/**
 * zxcvbn-backed password-strength check.
 * Extracted from monolith platform/dos/security/services/password-strength.service.ts.
 *
 * Wraps zxcvbn so callers get a stable, typed surface instead of the library's
 * shape. If zxcvbn is not installed (dev build without deps), falls back to a
 * regex-derived conservative score and records a warning via console.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPasswordStrength = checkPasswordStrength;
const LEVEL_MAP = {
    0: 'very_weak',
    1: 'weak',
    2: 'fair',
    3: 'strong',
    4: 'very_strong',
};
let _zxcvbnFn = null;
function getZxcvbn() {
    if (_zxcvbnFn !== null)
        return _zxcvbnFn;
    try {
        // zxcvbn is an optional peer — lazy-required so absence does not crash the process.
        const mod = require('zxcvbn');
        _zxcvbnFn = (mod?.default ?? mod);
        return _zxcvbnFn;
    }
    catch {
        _zxcvbnFn = false;
        return false;
    }
}
function fallbackScore(password) {
    let score = 0;
    if (password.length >= 12)
        score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password))
        score++;
    if (/\d/.test(password))
        score++;
    if (/[^A-Za-z0-9]/.test(password))
        score++;
    return Math.min(score, 4);
}
function checkPasswordStrength(password, userInputs = [], minScore = 3) {
    const z = getZxcvbn();
    if (z) {
        const result = z(password, userInputs);
        const feedback = [];
        if (result.feedback.warning)
            feedback.push(result.feedback.warning);
        feedback.push(...(result.feedback.suggestions || []));
        const score = Math.max(0, Math.min(4, Math.floor(result.score)));
        return {
            score,
            level: LEVEL_MAP[score],
            crackTimeDisplay: String(result.crack_times_display.offline_slow_hashing_1e4_per_second),
            feedback,
            acceptable: score >= minScore,
        };
    }
    const score = fallbackScore(password);
    const acceptable = score >= minScore;
    const feedback = [];
    if (password.length < 12)
        feedback.push('Use at least 12 characters.');
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password))
        feedback.push('Mix upper- and lower-case letters.');
    if (!/\d/.test(password))
        feedback.push('Include at least one number.');
    if (!/[^A-Za-z0-9]/.test(password))
        feedback.push('Include at least one symbol.');
    return {
        score,
        level: LEVEL_MAP[score],
        crackTimeDisplay: 'unknown (zxcvbn not installed)',
        feedback,
        acceptable,
    };
}
//# sourceMappingURL=password-strength.js.map