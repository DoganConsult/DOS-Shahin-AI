import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { DAUTH_CONCERNS } from '../../dos-auth/dist/index.js';
import { authenticate, getAuthMiddleware, requireAnyPermission, requirePermission, requireSuperAdmin, setAuthMiddleware } from '../../dos-auth/dist/middleware.js';
import { AUTH_ERRORS, buildAuthError } from '../../dos-auth/dist/contracts.js';
import type { AuthMiddleware, SessionCreateRequest } from '../../dos-auth/dist/contracts';
import type { DauthRuntimePorts } from '../../dos-auth/dist/ports';
import { DEFAULT_RETRY_POLICY } from '../../dos-module-sdk/dist/index.js';
import type { SecurityPolicyConfig } from '../../dos-types/dist/auth';
import { DOS_CONCERNS } from '../dist/index.js';
import type { DosRuntimePorts } from '../dist/ports';
import type { FeatureFlagContract, TenantContract } from '../../dos-contracts/dist/index';

describe('DOS-AIO package boundaries', () => {
  it('publishes the approved package subpath exports', async () => {
    const repoRoot = process.cwd();
    const files = [
      ['packages/dos-types/package.json', ['.', './auth']],
      ['packages/dos-contracts/package.json', ['.', './auth', './platform']],
      ['packages/dos-auth/package.json', ['.', './middleware', './contracts', './ports']],
      ['packages/dos-platform-core/package.json', ['.', './contracts', './ports']],
    ] as const;

    for (const [relativePath, expectedExports] of files) {
      const raw = await readFile(path.join(repoRoot, relativePath), 'utf8');
      const pkg = JSON.parse(raw) as { exports: Record<string, unknown> };
      for (const key of expectedExports) {
        expect(pkg.exports).toHaveProperty(key);
      }
    }
  });

  it('exposes canonical DAuth middleware through the package boundary', () => {
    const passThrough = vi.fn((_req, _res, next) => next());
    const middleware: AuthMiddleware = {
      authenticate: passThrough,
      optionalAuthenticate: passThrough,
      requirePermission: () => passThrough,
      requireAnyPermission: () => passThrough,
      requireSuperAdmin: passThrough,
    };

    setAuthMiddleware(middleware);

    expect(getAuthMiddleware()).toBe(middleware);
    expect(authenticate).toBeTypeOf('function');
    expect(requirePermission('policy.document.read')).toBe(passThrough);
    expect(requireAnyPermission('policy.document.read', 'policy.document.write')).toBe(passThrough);
    expect(requireSuperAdmin).toBeTypeOf('function');
  });

  it('exposes canonical auth error and concern surfaces', () => {
    expect(DAUTH_CONCERNS).toEqual(
      expect.arrayContaining(['access', 'authority', 'delegation', 'lifecycle-auth', 'scope', 'session', 'sod'])
    );
    expect(DOS_CONCERNS).toEqual(
      expect.arrayContaining(['events', 'lifecycle', 'modules', 'observability', 'provisioning', 'tenancy'])
    );
    expect(DEFAULT_RETRY_POLICY).toEqual({
      maxRetries: 3,
      baseDelayMs: 1000,
      backoffMultiplier: 2,
    });
    expect(AUTH_ERRORS.FORBIDDEN.status).toBe(403);
    expect(buildAuthError('FORBIDDEN', 'corr-1', { permission: 'policy.document.read' })).toEqual({
      code: 'FORBIDDEN',
      status: 403,
      message: 'Access denied',
      timestamp: expect.any(String),
      correlationId: 'corr-1',
      detail: { permission: 'policy.document.read' },
    });
  });

  it('keeps the package-first contract types aligned with DOS-AIO boundaries', () => {
    expectTypeOf<SessionCreateRequest>().toMatchTypeOf<{
      userId: string;
      email: string;
      tenantId: string;
      role: string;
    }>();

    expectTypeOf<DauthRuntimePorts>().toMatchTypeOf<{
      identity: object;
      session: object;
      access: object;
      scope: object;
      principalContext?: object;
    }>();

    expectTypeOf<DosRuntimePorts>().toMatchTypeOf<{
      events?: object;
      lifecycle?: object;
      modules?: object;
      products?: object;
      provisioning?: object;
      tenancy?: object;
      workspace?: object;
      observability?: object;
    }>();

    expectTypeOf<TenantContract>().toMatchTypeOf<{
      tenantId: string;
      name: string;
      status: 'active' | 'inactive' | 'suspended' | 'provisioning';
      plan: string;
      language: string;
      timezone: string;
    }>();

    expectTypeOf<FeatureFlagContract>().toMatchTypeOf<{
      flagCode: string;
      tenantId: string;
      isEnabled: boolean;
      metadata: Record<string, unknown>;
    }>();

    expectTypeOf<SecurityPolicyConfig>().toMatchTypeOf<{
      maxFailedAttempts: number;
      lockoutDurationMinutes: number;
      sessionTimeoutMinutes: number;
      mfaRequired: boolean;
      selfApprovalAllowed: boolean;
    }>();
  });
});
