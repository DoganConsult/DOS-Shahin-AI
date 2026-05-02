"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailBody = exports.requestEmailVerificationBody = exports.invitationAcceptBody = exports.mfaEmailChallengeBody = exports.mfaVerifyBody = exports.completePasswordResetBody = exports.requestPasswordResetBody = exports.changePasswordBody = exports.logoutBody = exports.refreshBody = exports.loginBody = void 0;
const zod_1 = require("zod");
const email = zod_1.z.string().email('Must be a valid email address').max(320).toLowerCase();
const password = zod_1.z.string().min(8).max(128);
exports.loginBody = zod_1.z.object({
    email,
    password,
    tenantCode: zod_1.z.string().min(1).max(100).optional(),
    rememberMe: zod_1.z.boolean().default(false),
}).strict();
exports.refreshBody = zod_1.z.object({
    refreshToken: zod_1.z.string().max(2048).optional(),
}).strict();
exports.logoutBody = zod_1.z.object({
    allSessions: zod_1.z.boolean().default(false),
}).strict();
exports.changePasswordBody = zod_1.z.object({
    currentPassword: password,
    newPassword: password,
    confirmPassword: zod_1.z.string().min(8).max(128),
}).strict().refine((d) => d.newPassword === d.confirmPassword, { message: 'newPassword and confirmPassword must match', path: ['confirmPassword'] }).refine((d) => d.newPassword !== d.currentPassword, { message: 'New password must differ from current password', path: ['newPassword'] });
exports.requestPasswordResetBody = zod_1.z.object({
    email,
}).strict();
exports.completePasswordResetBody = zod_1.z.object({
    token: zod_1.z.string().min(32).max(256),
    newPassword: password,
    confirmPassword: zod_1.z.string().min(8).max(128),
}).strict().refine((d) => d.newPassword === d.confirmPassword, { message: 'newPassword and confirmPassword must match', path: ['confirmPassword'] });
exports.mfaVerifyBody = zod_1.z.object({
    code: zod_1.z.string().regex(/^\d{6}$/, 'MFA code must be exactly 6 digits'),
    mfaType: zod_1.z.enum(['email', 'totp']),
    userId: zod_1.z.string().min(1).max(64),
}).strict();
exports.mfaEmailChallengeBody = zod_1.z.object({
    userId: zod_1.z.string().min(1).max(64),
}).strict();
exports.invitationAcceptBody = zod_1.z.object({
    token: zod_1.z.string().min(32).max(256),
    password,
    confirmPassword: zod_1.z.string().min(8).max(128),
    displayName: zod_1.z.string().min(1).max(255).optional(),
}).strict().refine((d) => d.password === d.confirmPassword, { message: 'password and confirmPassword must match', path: ['confirmPassword'] });
exports.requestEmailVerificationBody = zod_1.z.object({
    email,
}).strict();
exports.verifyEmailBody = zod_1.z.object({
    token: zod_1.z.string().min(32).max(256),
}).strict();
//# sourceMappingURL=auth.schemas.js.map