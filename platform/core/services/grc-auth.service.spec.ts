import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { GrcAuthService } from './grc-auth.service';
import { StorageService } from '@app/infrastructure';
import { AuthzClientService } from './authz-client.service';
import { GrcRoleService } from './grc-role.service';
import { GrcPermissionService } from './grc-permission.service';
import { ActorIdentityService } from './actor-identity.service';
import { WebSocketService } from '@app/websocket';
import { environment } from '@env/environment';
// ensurePlatform inlined below — manifest §1.4: services must not import product FE code.
function ensurePlatform() { /* test platform bootstrap; Angular TestBed already initialised by HttpClientTestingModule import */ }

describe('GrcAuthService — cookie session & metadata', () => {
  let service: GrcAuthService;
  let httpMock: HttpTestingController;
  let storageMock: Record<string, string>;
  let authzSetAuth: ReturnType<typeof vi.fn>;
  let authzLoadPermissions: ReturnType<typeof vi.fn>;
  let permHasPerm: ReturnType<typeof vi.fn>;
  let permHasFunc: ReturnType<typeof vi.fn>;
  let wsConnect: ReturnType<typeof vi.fn>;
  let wsDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ensurePlatform();
    storageMock = {};
    authzSetAuth = vi.fn();
    authzLoadPermissions = vi.fn().mockResolvedValue(undefined);
    permHasPerm = vi.fn().mockReturnValue(false);
    permHasFunc = vi.fn().mockResolvedValue(false);
    wsConnect = vi.fn();
    wsDisconnect = vi.fn();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GrcAuthService,
        {
          provide: StorageService,
          useValue: {
            get: (key: string) => storageMock[key] ?? null,
            set: (key: string, val: string) => {
              storageMock[key] = val;
            },
            remove: (key: string) => {
              delete storageMock[key];
            },
          },
        },
        {
          provide: AuthzClientService,
          useValue: {
            setAuthorization: authzSetAuth,
            loadPermissions: authzLoadPermissions,
            clear: vi.fn(),
            authz: () => null,
          },
        },
        {
          provide: GrcRoleService,
          useValue: { getRoleLandingPage: () => '/dashboard', getRoleModules: () => [] },
        },
        {
          provide: GrcPermissionService,
          useValue: {
            hasPermission: permHasPerm,
            hasEnterprisePermission: vi.fn().mockReturnValue(false),
            canAccessModule: vi.fn().mockReturnValue(true),
            hasFunction: permHasFunc,
            clearCache: vi.fn(),
          },
        },
        {
          provide: ActorIdentityService,
          useValue: {
            profile: () => null,
            loadProfile: vi.fn().mockResolvedValue(undefined),
            clearCache: vi.fn(),
          },
        },
        {
          provide: WebSocketService,
          useValue: { connect: wsConnect, disconnect: wsDisconnect },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });

    service = TestBed.inject(GrcAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('defaults currentRole to "viewer" when no profile', () => {
    expect(service.currentRole()).toBe('viewer');
  });

  it('defaults tenantId to null when no profile', () => {
    expect(service.tenantId()).toBeNull();
  });

  it('hasRole returns false when no profile is set', () => {
    expect(service.hasRole('viewer')).toBe(false);
  });

  it('getToken returns empty string', async () => {
    await expect(service.getToken()).resolves.toBe('');
  });

  describe('setSession (metadata only, not login truth)', () => {
    it('persists tenant/role/userName but does not set userProfile or isLoggedIn', () => {
      service.setSession({
        token: 'ignored.jwt.here',
        tenantId: 't1',
        role: 'compliance_officer',
        userName: 'Test User',
      });

      expect(storageMock['grc_tenantId']).toBe('t1');
      expect(storageMock['grc_role']).toBe('compliance_officer');
      expect(storageMock['grc_userName']).toBe('Test User');
      expect(service.userProfile()).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
      expect(storageMock['grc_token']).toBeUndefined();
    });

    it('maps enterpriseAuthz.scopes objects to string[] for AuthzClientService', () => {
      service.setSession({
        tenantId: 't4',
        role: 'viewer',
        enterpriseAuthz: {
          accessProfiles: ['ap1'],
          permissions: ['perm.read'],
          scopes: [
            { moduleCode: 'compliance', scopeType: 'module', scopeId: 1 },
            { moduleCode: 'risk', scopeType: 'module', scopeId: 2 },
          ],
          functionalRoles: ['fr1'],
        },
      });

      expect(authzSetAuth).toHaveBeenCalledWith({
        accessProfiles: ['ap1'],
        permissions: ['perm.read'],
        scopes: ['compliance', 'risk'],
        functionalRoles: ['fr1'],
      });
    });

    it('calls loadPermissions when enterpriseAuthz has no permissions', async () => {
      service.setSession({ tenantId: 't9', role: 'viewer', enterpriseAuthz: null });
      await Promise.resolve();
      expect(authzLoadPermissions).toHaveBeenCalled();
    });
  });

  describe('init + hydrateFromCookieSession', () => {
    async function flushSuccessfulSession(role = 'compliance_officer'): Promise<void> {
      const p = service.init();
      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/auth/oidc/session` && r.method === 'GET',
      );
      expect(req.request.withCredentials).toBe(true);
      req.flush({
        authenticated: true,
        user: { id: 'u1', email: 'a@b.com', name: 'Test User' },
        tenant: { id: 't1', name: 'Org', slug: 'org' },
        role,
        isSuperAdmin: false,
      });
      await p;
    }

    it('sets profile and isLoggedIn from /auth/oidc/session', async () => {
      await flushSuccessfulSession();

      expect(service.isLoggedIn()).toBe(true);
      const p = service.userProfile();
      expect(p).not.toBeNull();
      expect(p!.userId).toBe('u1');
      expect(p!.highestRole).toBe('compliance_officer');
      expect(p!.tenantId).toBe('t1');
      expect(storageMock['grc_userId']).toBe('u1');
      expect(storageMock['grc_tenantId']).toBe('t1');
      expect(authzLoadPermissions).toHaveBeenCalled();
    });

    it('connects WebSocket on /ws after successful hydration', async () => {
      await flushSuccessfulSession();
      await new Promise<void>(resolve => {
        queueMicrotask(() => resolve());
      });
      expect(wsConnect).toHaveBeenCalledWith('/ws');
    });

    it('hasRole works after hydration', async () => {
      await flushSuccessfulSession('compliance_officer');
      expect(service.hasRole('compliance_officer')).toBe(true);
      expect(service.hasRole('viewer')).toBe(true);
      expect(service.hasRole('platform_admin')).toBe(false);
    });
  });

  describe('permission delegation (1-arg signatures)', () => {
    it('hasPermission passes single permission string to GrcPermissionService', () => {
      service.hasPermission('compliance.read');
      expect(permHasPerm).toHaveBeenCalledWith('compliance.read');
      expect(permHasPerm).toHaveBeenCalledTimes(1);
    });

    it('hasFunction passes single functionCode to GrcPermissionService', async () => {
      await service.hasFunction('risk.create');
      expect(permHasFunc).toHaveBeenCalledWith('risk.create');
      expect(permHasFunc).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout clears state', () => {
    it('clears profile, login state, legacy keys, and disconnects WS', async () => {
      const p = service.init();
      httpMock
        .expectOne(r => r.url.includes('/auth/oidc/session'))
        .flush({
          authenticated: true,
          user: { id: 'u6', email: 'x@y.com', name: 'U6' },
          tenant: { id: 't6', name: null, slug: null },
          role: 'viewer',
        });
      await p;

      expect(service.isLoggedIn()).toBe(true);
      service.logout();
      httpMock.expectOne(r => r.url.includes('/auth/oidc/logout')).flush({});

      expect(wsDisconnect).toHaveBeenCalled();
      expect(service.isLoggedIn()).toBe(false);
      expect(service.userProfile()).toBeNull();
      expect(storageMock['grc_token']).toBeUndefined();
    });
  });
});
