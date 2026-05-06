/**
 * Access Profile Service — DAuth access profile CRUD tests
 *
 * @owner DAuth
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getAccessProfiles,
  getAccessProfile,
  assignAccessProfile,
  revokeAccessProfile,
  getUserAccessProfiles,
} from './access-profile.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ---------------------------------------------------------------------------
// getAccessProfiles
// ---------------------------------------------------------------------------
describe('getAccessProfiles', () => {
  it('returns mapped access profile rows', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          profile_code: 'admin_profile',
          name_en: 'Admin Profile',
          name_ar: 'ملف المسؤول',
          is_system: true,
          is_active: true,
          default_landing_page: '/admin',
          allowed_modules: ['risk', 'audit'],
        },
      ],
      rowCount: 1,
    });

    const result = await getAccessProfiles('t1');
    expect(result).toHaveLength(1);
    expect(result[0].profileCode).toBe('admin_profile');
    expect(result[0].tenantLandingRoute).toBe('/admin');
    expect(result[0].allowedModules).toEqual(['risk', 'audit']);
    expect(result[0].isSystem).toBe(true);
  });

  it('returns empty array when no profiles exist', async () => {
    const result = await getAccessProfiles('t1');
    expect(result).toEqual([]);
  });

  it('defaults missing fields to safe values', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          profile_code: 'minimal',
          name_en: null,
          name_ar: null,
          is_system: false,
          is_active: true,
          default_landing_page: null,
          allowed_modules: null,
        },
      ],
      rowCount: 1,
    });

    const result = await getAccessProfiles('t1');
    expect(result[0].nameEn).toBe('');
    expect(result[0].nameAr).toBe('');
    // No frontend fallback: missing default_landing_page → null.
    // Operator must seed dos.tenant_landing_config; consumer renders empty.
    expect(result[0].tenantLandingRoute).toBeNull();
    expect(result[0].allowedModules).toEqual([]);
  });

  it('queries only active profiles', async () => {
    await getAccessProfiles('t1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_active = TRUE'),
      [],
    );
  });
});

// ---------------------------------------------------------------------------
// getAccessProfile
// ---------------------------------------------------------------------------
describe('getAccessProfile', () => {
  it('returns a profile when found', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          profile_code: 'viewer_profile',
          name_en: 'Viewer',
          name_ar: 'مشاهد',
          is_system: false,
          is_active: true,
          default_landing_page: '/dashboard',
          allowed_modules: ['risk'],
        },
      ],
      rowCount: 1,
    });

    const result = await getAccessProfile('t1', 'viewer_profile');
    expect(result).not.toBeNull();
    expect(result!.profileCode).toBe('viewer_profile');
    expect(result!.allowedModules).toEqual(['risk']);
  });

  it('returns null when not found', async () => {
    const result = await getAccessProfile('t1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('defaults null fields to safe values', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { profile_code: 'p1', name_en: null, name_ar: null, is_system: false, is_active: true, default_landing_page: null, allowed_modules: null },
      ],
      rowCount: 1,
    });

    const result = await getAccessProfile('t1', 'p1');
    expect(result!.nameEn).toBe('');
    // No frontend fallback: missing default_landing_page → null.
    expect(result!.tenantLandingRoute).toBeNull();
    expect(result!.allowedModules).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// assignAccessProfile
// ---------------------------------------------------------------------------
describe('assignAccessProfile', () => {
  it('assigns a profile to a user and publishes event', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await assignAccessProfile('t1', 'user-1', 'admin_profile', 'admin');

    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      ['user-1', 'admin_profile', 'admin'],
    );
    expect(mockPublish).toHaveBeenCalledWith('dauth.access_profile.assigned', 't1', expect.objectContaining({
      userId: 'user-1',
      profileCode: 'admin_profile',
    }));
  });

  it('uses ON CONFLICT to upsert on re-assignment', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await assignAccessProfile('t1', 'user-1', 'admin_profile', 'admin');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      expect.any(Array),
    );
  });

  it('passes the correct schema for the tenant', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await assignAccessProfile('my_tenant', 'u1', 'prof', 'admin');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_my_tenant"'),
      expect.any(Array),
    );
  });
});

// ---------------------------------------------------------------------------
// revokeAccessProfile
// ---------------------------------------------------------------------------
describe('revokeAccessProfile', () => {
  it('deactivates the user profile assignment and publishes event', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await revokeAccessProfile('t1', 'user-1', 'admin_profile', 'admin');

    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('SET is_active = FALSE'),
      ['user-1', 'admin_profile'],
    );
    expect(mockPublish).toHaveBeenCalledWith('dauth.access_profile.revoked', 't1', expect.objectContaining({
      userId: 'user-1',
      profileCode: 'admin_profile',
      revokedBy: 'admin',
    }));
  });

  it('still publishes event even if no rows were affected', async () => {
    // The service does not check rowCount before publishing
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await revokeAccessProfile('t1', 'user-1', 'nonexistent', 'admin');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('uses UPDATE (not DELETE) for soft deactivation', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await revokeAccessProfile('t1', 'u1', 'p1', 'admin');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      expect.any(Array),
    );
  });
});

// ---------------------------------------------------------------------------
// getUserAccessProfiles
// ---------------------------------------------------------------------------
describe('getUserAccessProfiles', () => {
  it('returns profile codes for a user', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { access_profile_code: 'admin_profile' },
        { access_profile_code: 'viewer_profile' },
      ],
      rowCount: 2,
    });

    const result = await getUserAccessProfiles('t1', 'user-1');
    expect(result).toEqual(['admin_profile', 'viewer_profile']);
  });

  it('returns empty array when user has no profiles', async () => {
    const result = await getUserAccessProfiles('t1', 'new_user');
    expect(result).toEqual([]);
  });

  it('filters by active assignments only', async () => {
    await getUserAccessProfiles('t1', 'u1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_active = TRUE'),
      ['u1'],
    );
  });
});
