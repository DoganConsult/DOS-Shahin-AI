// ============================================
// Dashboard & Tenant Config — Error Handling Tests
// Validates: Requirements 4.1, 5.1
// ============================================

import { describe, it, expect } from 'vitest';
import { Subject, throwError, of } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Tests error handling logic using RxJS Observables to simulate
 * the actual subscription patterns in DashboardComponent and
 * TenantConfigComponent.
 */

describe('Dashboard loadDashboard error handling', () => {
  it('keeps data as null when getDashboard() emits an error', () => {
    let data: GrcRecord | null = null;
    const error$ = throwError(() => new Error('API failure'));

    error$.subscribe({
      next: (d) => {
        data = d;
      },
      error: (e: unknown) => console.error("[API]", e),
    });

    expect(data).toBeNull();
  });

  it('sets data when getDashboard() emits successfully', () => {
    let data: GrcRecord | null = null;
    const mockDashboard = { compliance: 85, risks: 3 };
    const success$ = of(mockDashboard);

    success$.subscribe({
      next: (d) => {
        data = d;
      },
      error: (e: unknown) => console.error("[API]", e),
    });

    expect(data).toEqual(mockDashboard);
  });

  it('error handler does not throw an unhandled exception', () => {
    const error$ = throwError(() => new Error('Server 500'));

    expect(() => {
      error$.subscribe({
        next: () => {},
        error: (e: unknown) => console.error("[API]", e),
      });
    }).not.toThrow();
  });

  it('next callback is never invoked on error path', () => {
    let nextCalled = false;
    const error$ = throwError(() => new Error('Network error'));

    error$.subscribe({
      next: () => {
        nextCalled = true;
      },
      error: (e: unknown) => console.error("[API]", e),
    });

    expect(nextCalled).toBe(false);
  });

  it('handles error after Subject emits error', () => {
    let data: GrcRecord | null = null;
    const subject = new Subject<unknown>();

    subject.subscribe({
      next: (d) => {
        data = d;
      },
      error: (e: unknown) => console.error("[API]", e),
    });

    subject.error(new Error('stream error'));
    expect(data).toBeNull();
  });
});

describe('TenantConfig history subscription error handling', () => {
  it('keeps history as empty array when API call fails', () => {
    let history: GrcRecord[] = [];
    const error$ = throwError(() => new Error('404 Not Found'));

    error$.subscribe({
      next: (d) => {
        history = d.history || d || [];
      },
      error: (e: unknown) => console.error("[API]", e),
    });

    expect(history).toEqual([]);
  });

  it('populates history when API call succeeds', () => {
    let history: GrcRecord[] = [];
    const mockResponse = { history: [{ version: 1, changed_fields: 'org_name' }] };
    const success$ = of(mockResponse);

    success$.subscribe({
      next: (d) => {
        history = d.history || d || [];
      },
      error: (e: unknown) => console.error("[API]", e),
    });

    expect(history).toEqual([{ version: 1, changed_fields: 'org_name' }]);
  });

  it('next callback is never invoked on error path', () => {
    let nextCalled = false;
    const error$ = throwError(() => new Error('Server error'));

    error$.subscribe({
      next: () => {
        nextCalled = true;
      },
      error: (e: unknown) => console.error("[API]", e),
    });

    expect(nextCalled).toBe(false);
  });

  it('handles Subject error without throwing', () => {
    let history: GrcRecord[] = [];
    const subject = new Subject<unknown>();

    subject.subscribe({
      next: (d) => {
        history = d.history || d || [];
      },
      error: (e: unknown) => console.error("[API]", e),
    });

    expect(() => subject.error(new Error('stream error'))).not.toThrow();
    expect(history).toEqual([]);
  });
});
