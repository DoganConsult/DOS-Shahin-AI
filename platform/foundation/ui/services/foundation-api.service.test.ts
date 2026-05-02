/**
 * Foundation remediation: API path/verb contracts + overview loadErrors.
 * Uses a stub HttpClient (no TestBed) so Vitest runs in node without jsdom/DocumentToken issues.
 */
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

vi.mock('@env/environment', () => ({
  environment: {
    apiUrl: '/api',
  },
}));

import { FoundationApiService } from './foundation-api.service';
import { environment } from '@env/environment';

describe('FoundationApiService (remediation contracts)', () => {
  const api = environment.apiUrl;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPost: ReturnType<typeof vi.fn>;
  let httpDelete: ReturnType<typeof vi.fn>;
  let service: FoundationApiService;

  beforeEach(() => {
    httpGet = vi.fn();
    httpPost = vi.fn();
    httpDelete = vi.fn();
    const http = { get: httpGet, post: httpPost, delete: httpDelete } as unknown as HttpClient;
    service = new FoundationApiService(http);
  });

  it('approveDelegation uses POST /governance/delegations/:id/approve', async () => {
    httpPost.mockReturnValue(of({}));
    await firstValueFrom(service.approveDelegation('d1'));
    expect(httpPost).toHaveBeenCalledWith(`${api}/governance/delegations/d1/approve`, {});
  });

  it('rejectDelegation uses POST /governance/delegations/:id/reject with { reason }', async () => {
    httpPost.mockReturnValue(of({}));
    await firstValueFrom(service.rejectDelegation('d2', 'not allowed'));
    expect(httpPost).toHaveBeenCalledWith(`${api}/governance/delegations/d2/reject`, {
      reason: 'not allowed',
    });
  });

  it('revokeDelegation uses DELETE /governance/delegations/:id', async () => {
    httpDelete.mockReturnValue(of({}));
    await firstValueFrom(service.revokeDelegation('d3'));
    expect(httpDelete).toHaveBeenCalledWith(`${api}/governance/delegations/d3`);
  });

  it('getDelegations uses GET /governance/delegations', async () => {
    httpGet.mockReturnValue(of({ delegations: [] }));
    await firstValueFrom(service.getDelegations());
    expect(httpGet).toHaveBeenCalledWith(`${api}/governance/delegations`);
  });

  it('getTeamMemberLifecycle uses GET /member-lifecycle/:userId', async () => {
    httpGet.mockReturnValue(of({}));
    await firstValueFrom(service.getTeamMemberLifecycle('u-99'));
    expect(httpGet).toHaveBeenCalledWith(`${api}/member-lifecycle/u-99`);
  });

  it('getRoleAssignmentHistory encodes role code in path', async () => {
    httpGet.mockReturnValue(of({ history: [] }));
    await firstValueFrom(service.getRoleAssignmentHistory('Tenant Admin'));
    expect(httpGet).toHaveBeenCalledWith(`${api}/roles/Tenant%20Admin/assignment-history`);
  });

  it('getLookups returns lookupsLoadError when GET /foundation/lookups fails', async () => {
    const err = new HttpErrorResponse({
      status: 503,
      statusText: 'Service Unavailable',
      error: { error: 'upstream down' },
    });
    httpGet.mockReturnValue(throwError(() => err));
    const result = await firstValueFrom(service.getLookups());
    expect(httpGet).toHaveBeenCalledWith(`${api}/foundation/lookups`);
    expect(result.lookupsLoadError).toBeDefined();
    expect(String(result.lookupsLoadError)).toMatch(/upstream down|503/i);
  });

  it('getFoundationSurfaces preserves lookupsLoadError and empty surfaces on lookups failure', async () => {
    const err = new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway', error: { error: 'bad' } });
    httpGet.mockReturnValue(throwError(() => err));
    const result = await firstValueFrom(service.getFoundationSurfaces());
    expect(result.foundationSurfaces).toEqual([]);
    expect(result.lookupsLoadError).toBeDefined();
    expect(String(result.lookupsLoadError)).toMatch(/502|bad/i);
  });

  it('getFoundationSurfaces returns surfaces when lookups succeed', async () => {
    const surfaces = [{ id: 's1', classification: 'core' }];
    httpGet.mockReturnValue(of({ foundationSurfaces: surfaces }));
    const result = await firstValueFrom(service.getFoundationSurfaces());
    expect(result.foundationSurfaces).toEqual(surfaces);
    expect(result.lookupsLoadError).toBeUndefined();
  });

  it('getOverviewData skips deferred workflow slices by default', async () => {
    httpGet.mockImplementation((url: string) => {
      if (url === `${api}/foundation/users`) return of({ users: [] });
      if (url === `${api}/foundation/departments`) return of({ departments: [] });
      if (url === `${api}/locations`) return of({ locations: [] });
      if (url === `${api}/organizations`) return of({ organizations: [] });
      if (url === `${api}/business-units`) return of({ businessUnits: [] });
      if (url === `${api}/profiles/roles`) return of({ profiles: [] });
      if (url === `${api}/audit-trail?limit=20`) return of({ entries: [] });
      if (url === `${api}/invitations`) return of({ invitations: [] });
      if (url === `${api}/foundation/teams`) return of({ teams: [] });
      if (url === `${api}/positions`) return of({ positions: [] });
      if (url === `${api}/committees`) return of({ committees: [] });
      return throwError(() => new Error(`unexpected GET ${url}`));
    });

    const data = await firstValueFrom(service.getOverviewData());
    const requestedUrls = httpGet.mock.calls.map(([url]) => url);

    expect(requestedUrls).not.toContain(`${api}/governance/delegations`);
    expect(requestedUrls).not.toContain(`${api}/governance/policies`);
    expect(data.delegations).toEqual({ delegations: [] });
    expect(data.policies).toEqual({ policies: [] });
  });

  it('getOverviewData includes workflow slices when explicitly enabled', async () => {
    httpGet.mockImplementation((url: string) => {
      if (url === `${api}/foundation/users`) return of({ users: [] });
      if (url === `${api}/foundation/departments`) return of({ departments: [] });
      if (url === `${api}/locations`) return of({ locations: [] });
      if (url === `${api}/organizations`) return of({ organizations: [] });
      if (url === `${api}/business-units`) return of({ businessUnits: [] });
      if (url === `${api}/profiles/roles`) return of({ profiles: [] });
      if (url === `${api}/audit-trail?limit=20`) return of({ entries: [] });
      if (url === `${api}/invitations`) return of({ invitations: [] });
      if (url === `${api}/foundation/teams`) return of({ teams: [] });
      if (url === `${api}/positions`) return of({ positions: [] });
      if (url === `${api}/committees`) return of({ committees: [] });
      if (url === `${api}/governance/delegations`) return of({ delegations: [{ id: 'dg-1' }] });
      if (url === `${api}/governance/policies`) return of({ policies: [{ id: 'pl-1' }] });
      return throwError(() => new Error(`unexpected GET ${url}`));
    });

    const data = await firstValueFrom(service.getOverviewData({ includeWorkflowSlices: true }));
    const requestedUrls = httpGet.mock.calls.map(([url]) => url);

    expect(requestedUrls).toContain(`${api}/governance/delegations`);
    expect(requestedUrls).toContain(`${api}/governance/policies`);
    expect(data.delegations).toEqual({ delegations: [{ id: 'dg-1' }] });
    expect(data.policies).toEqual({ policies: [{ id: 'pl-1' }] });
  });

  it('getOverviewData records loadErrors when a slice fails and still completes', async () => {
    const err403 = new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
      error: { error: 'Forbidden' },
    });
    httpGet.mockImplementation((url: string) => {
      if (url === `${api}/foundation/users`) return throwError(() => err403);
      if (url === `${api}/foundation/departments`) return of({ departments: [] });
      if (url === `${api}/locations`) return of({});
      if (url === `${api}/organizations`) return of({});
      if (url === `${api}/business-units`) return of({});
      if (url === `${api}/profiles/roles`) return of({});
      if (url === `${api}/audit-trail?limit=20`) return of({});
      if (url === `${api}/invitations`) return of({});
      if (url === `${api}/foundation/teams`) return of({ teams: [] });
      if (url === `${api}/positions`) return of({});
      if (url === `${api}/committees`) return of({});
      if (url === `${api}/assets`) return of({});
      return throwError(() => new Error(`unexpected GET ${url}`));
    });

    const data = await firstValueFrom(service.getOverviewData());
    expect(data.loadErrors).toBeDefined();
    expect(data.loadErrors!['users']).toMatch(/403|Forbidden/i);
    expect(data.users).toEqual({ users: [] });
  });
});
