import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('@dos/db', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  query: (...args: unknown[]) => mockQuery(...args),
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock token service
const mockGenerateAccessToken = vi.fn().mockReturnValue('mock-access-token');
const mockGenerateRefreshToken = vi.fn().mockReturnValue('mock-refresh-token');
const mockDecodeTokenUnsafe = vi.fn().mockReturnValue({ jti: 'jti-001', userId: 'u-001', tenantId: 't-001' });
const mockGetExpirySeconds = vi.fn().mockReturnValue(900);
vi.mock('./token.service', () => ({
  generateAccessToken: (...args: unknown[]) => mockGenerateAccessToken(...args),
  generateRefreshToken: (...args: unknown[]) => mockGenerateRefreshToken(...args),
  decodeTokenUnsafe: (...args: unknown[]) => mockDecodeTokenUnsafe(...args),
  getAccessTokenExpirySeconds: () => mockGetExpirySeconds(),
}));

// Mock session services
const mockRegisterJti = vi.fn().mockResolvedValue(undefined);
vi.mock('../session/token-blacklist.service', () => ({
  registerActiveJtiForUser: (...args: unknown[]) => mockRegisterJti(...args),
}));

// Mock audit
const mockLogAuthDecision = vi.fn().mockResolvedValue(undefined);
vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: (...args: unknown[]) => mockLogAuthDecision(...args),
}));

// Mock events
vi.mock('@dos/platform-core/events', () => ({
  publish: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock resilience
vi.mock('@dos/platform-core/resilience', () => ({
  catchHandler: () => () => {},
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

// Mock dauth config
vi.mock('../dauth.config', () => ({
  DAUTH_CONFIG: {
    loginContextTimeoutMs: 1200,
    optionalAuthzTimeoutMs: 700,
  },
}));

import {
  authenticateCredentials,
  checkAccountStatus,
  buildMustChangePasswordResponse,
  resolveUserRoles,
  issueLoginTokens,
} from './auth-orchestrator.service';
import bcrypt from 'bcryptjs';

describe('DAuth AuthOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateCredentials', () => {
    it('returns null when user not found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });

      const result = await authenticateCredentials('nobody@test.com', 'password');
      expect(result).toBeNull();
    });

    it('returns null when password is invalid', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'u-001', email: 'user@test.com', tenant_id: 't-001', role: 'user', name: 'Test', status: 'active', onboarding_complete: true, member_onboarded: true, is_super_admin: false, must_change_password: false }],
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      const result = await authenticateCredentials('user@test.com', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('returns user when credentials are valid', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'u-001', email: 'user@test.com', tenant_id: 't-001', role: 'admin', name: 'Test User', status: 'active', onboarding_complete: true, member_onboarded: true, is_super_admin: false, must_change_password: false, password_hash: 'hashed' }],
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const result = await authenticateCredentials('user@test.com', 'correctpassword');
      expect(result).not.toBeNull();
      expect(result!.user_id).toBe('u-001');
      expect(result!.email).toBe('user@test.com');
      expect(result!.role).toBe('admin');
    });
  });

  describe('checkAccountStatus', () => {
    it('returns null for active status', () => {
      expect(checkAccountStatus('active')).toBeNull();
    });

    it('returns suspended for suspended status', () => {
      expect(checkAccountStatus('suspended')).toBe('suspended');
    });

    it('returns inactive for deactivated status', () => {
      expect(checkAccountStatus('deactivated')).toBe('inactive');
    });

    it('returns inactive for inactive status', () => {
      expect(checkAccountStatus('inactive')).toBe('inactive');
    });
  });

  describe('resolveUserRoles', () => {
    it('includes base role and enterprise roles', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ role_code: 'compliance_officer' }, { role_code: 'risk_manager' }],
      });

      const roles = await resolveUserRoles('u-001', 't-001', 'admin');
      expect(roles).toContain('admin');
      expect(roles).toContain('compliance_officer');
      expect(roles).toContain('risk_manager');
    });

    it('returns base role when no enterprise roles found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });

      const roles = await resolveUserRoles('u-001', 't-001', 'user');
      expect(roles).toEqual(['user']);
    });
  });

  describe('issueLoginTokens', () => {
    it('generates access and refresh tokens', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // session insert

      const user = { user_id: 'u-001', email: 'user@test.com', tenant_id: 't-001', is_super_admin: false };
      const tokens = await issueLoginTokens(user, 'admin', false, '127.0.0.1', 'Mozilla');

      expect(tokens.accessToken).toBe('mock-access-token');
      expect(tokens.refreshToken).toBe('mock-refresh-token');
      expect(tokens.accessJti).toBe('jti-001');
      expect(mockGenerateAccessToken).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u-001',
        role: 'admin',
      }));
    });

    it('registers JTI for active session tracking', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const user = { user_id: 'u-001', email: 'user@test.com', tenant_id: 't-001', is_super_admin: false };
      await issueLoginTokens(user, 'admin', false, '127.0.0.1', 'Mozilla');

      expect(mockRegisterJti).toHaveBeenCalledWith('u-001', 'jti-001', 900);
    });
  });

  describe('buildMustChangePasswordResponse', () => {
    it('returns a must-change-password response shape', () => {
      const result = buildMustChangePasswordResponse('u-001', 'temp-token');
      expect(result).toHaveProperty('mustChangePassword', true);
      expect(result).toHaveProperty('userId', 'u-001');
      expect(result).toHaveProperty('temporaryToken', 'temp-token');
    });
  });
});
