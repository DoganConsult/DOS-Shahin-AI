import { z } from 'zod';

const email = z.string().email('Must be a valid email address').max(320).toLowerCase();
const password = z.string().min(8).max(128);

export const loginBody = z.object({
  email,
  password,
  tenantCode: z.string().min(1).max(100).optional(),
  rememberMe: z.boolean().default(false),
}).strict();

export const refreshBody = z.object({
  refreshToken: z.string().max(2048).optional(),
}).strict();

export const logoutBody = z.object({
  allSessions: z.boolean().default(false),
}).strict();

export const changePasswordBody = z.object({
  currentPassword: password,
  newPassword: password,
  confirmPassword: z.string().min(8).max(128),
}).strict().refine(
  (d) => d.newPassword === d.confirmPassword,
  { message: 'newPassword and confirmPassword must match', path: ['confirmPassword'] },
).refine(
  (d) => d.newPassword !== d.currentPassword,
  { message: 'New password must differ from current password', path: ['newPassword'] },
);

export const requestPasswordResetBody = z.object({
  email,
}).strict();

export const completePasswordResetBody = z.object({
  token: z.string().min(32).max(256),
  newPassword: password,
  confirmPassword: z.string().min(8).max(128),
}).strict().refine(
  (d) => d.newPassword === d.confirmPassword,
  { message: 'newPassword and confirmPassword must match', path: ['confirmPassword'] },
);

export const mfaVerifyBody = z.object({
  code: z.string().regex(/^\d{6}$/, 'MFA code must be exactly 6 digits'),
  mfaType: z.enum(['email', 'totp']),
  userId: z.string().min(1).max(64),
}).strict();

export const mfaEmailChallengeBody = z.object({
  userId: z.string().min(1).max(64),
}).strict();

export const invitationAcceptBody = z.object({
  token: z.string().min(32).max(256),
  password,
  confirmPassword: z.string().min(8).max(128),
  displayName: z.string().min(1).max(255).optional(),
}).strict().refine(
  (d) => d.password === d.confirmPassword,
  { message: 'password and confirmPassword must match', path: ['confirmPassword'] },
);

export const requestEmailVerificationBody = z.object({
  email,
}).strict();

export const verifyEmailBody = z.object({
  token: z.string().min(32).max(256),
}).strict();

export type LoginInput = z.infer<typeof loginBody>;
export type RefreshInput = z.infer<typeof refreshBody>;
export type ChangePasswordInput = z.infer<typeof changePasswordBody>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetBody>;
export type CompletePasswordResetInput = z.infer<typeof completePasswordResetBody>;
export type MfaVerifyInput = z.infer<typeof mfaVerifyBody>;
export type InvitationAcceptInput = z.infer<typeof invitationAcceptBody>;
