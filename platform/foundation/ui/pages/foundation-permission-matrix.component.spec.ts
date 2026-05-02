import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import {
  FoundationPermissionMatrixComponent,
  normalizeFoundationRoles,
  normalizeRolePermissions,
} from './foundation-permission-matrix.component';

describe('FoundationPermissionMatrixComponent', () => {
  let component: FoundationPermissionMatrixComponent;
  let fixture: ComponentFixture<FoundationPermissionMatrixComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationPermissionMatrixComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } }, params: of({ id: '1' }), queryParams: of({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoundationPermissionMatrixComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => req.flush({}));
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders rows from a successful /foundation/roles + /roles/:code/permissions flow', () => {
    const rolesReq = httpMock.expectOne((r) => r.url.endsWith('/foundation/roles'));
    rolesReq.flush({ roles: [{ code: 'admin', name_en: 'Administrator', is_system: true, permissions: ['SHOULD_BE_IGNORED'] }] });
    const permReq = httpMock.expectOne((r) => r.url.endsWith('/roles/admin/permissions'));
    permReq.flush({ permissions: ['foundation.org.read', 'foundation.org.write'] });
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.rows().length).toBe(1);
    expect(component.rows()[0].roleCode).toBe('admin');
    expect(component.rows()[0].isSystem).toBe(true);
    expect(component.rows()[0].permissions).toEqual(['foundation.org.read', 'foundation.org.write']);
  });

  it('surfaces /foundation/roles failure and does NOT render any rows (no hardcoded fallback)', () => {
    const rolesReq = httpMock.expectOne((r) => r.url.endsWith('/foundation/roles'));
    rolesReq.flush({ message: 'Boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.rows().length).toBe(0);
    expect(component.filtered().length).toBe(0);
  });

  it('surfaces /roles/:code/permissions failure WITHOUT silently falling back to inline role.permissions', () => {
    // Role response includes an inline `permissions` array — the old code used
    // this as a silent fallback when the per-role permissions call failed.
    // The fix must NOT render that stale/inline data.
    const rolesReq = httpMock.expectOne((r) => r.url.endsWith('/foundation/roles'));
    rolesReq.flush({
      roles: [
        { code: 'auditor', name_en: 'Auditor', is_system: false, permissions: ['STALE_INLINE_PERM_A', 'STALE_INLINE_PERM_B'] },
      ],
    });
    const permReq = httpMock.expectOne((r) => r.url.endsWith('/roles/auditor/permissions'));
    permReq.flush({ message: 'perm endpoint down' }, { status: 502, statusText: 'Bad Gateway' });
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.rows().length).toBe(0);
    // The critical assertion: stale inline permissions must not leak into the view.
    const allRendered = component.rows().flatMap((r) => r.permissions);
    expect(allRendered).not.toContain('STALE_INLINE_PERM_A');
    expect(allRendered).not.toContain('STALE_INLINE_PERM_B');
  });

  it('retry() triggers a fresh /foundation/roles request', () => {
    const first = httpMock.expectOne((r) => r.url.endsWith('/foundation/roles'));
    first.flush({ message: 'Boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();

    component.load();
    const retried = httpMock.expectOne((r) => r.url.endsWith('/foundation/roles'));
    expect(retried.request.method).toBe('GET');
    retried.flush({ roles: [] });
    fixture.detectChanges();
    expect(component.error()).toBeNull();
    expect(component.rows().length).toBe(0);
  });
});

describe('permission-matrix adapters (pure)', () => {
  it('normalizeFoundationRoles returns [] for null/undefined/non-object/missing-key', () => {
    expect(normalizeFoundationRoles(null)).toEqual([]);
    expect(normalizeFoundationRoles(undefined)).toEqual([]);
    expect(normalizeFoundationRoles('x')).toEqual([]);
    expect(normalizeFoundationRoles({})).toEqual([]);
    expect(normalizeFoundationRoles({ profiles: [{ code: 'x' }] })).toEqual([]); // legacy `profiles` NOT accepted
  });

  it('normalizeFoundationRoles extracts the typed `roles` field', () => {
    const res = { roles: [{ code: 'admin' }, { code: 'auditor' }] };
    expect(normalizeFoundationRoles(res).map((r) => r.code)).toEqual(['admin', 'auditor']);
  });

  it('normalizeRolePermissions safely coerces non-array inputs to []', () => {
    expect(normalizeRolePermissions(null)).toEqual([]);
    expect(normalizeRolePermissions({})).toEqual([]);
    expect(normalizeRolePermissions({ permissions: 'nope' })).toEqual([]);
  });

  it('normalizeRolePermissions stringifies array entries', () => {
    expect(normalizeRolePermissions({ permissions: ['a', 42, true] })).toEqual(['a', '42', 'true']);
  });
});
