import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
import {
  RawFoundationRole,
  normalizeFoundationRoles,
  normalizeRolePermissions,
} from './foundation-permission-matrix.adapters';

// Re-exports so existing spec files / consumers keep their import site stable.
export { normalizeFoundationRoles, normalizeRolePermissions };
export type { RawFoundationRole };

interface PermRow {
  role: string;
  roleCode: string;
  isSystem: boolean;
  permissions: string[];
}

@Component({
  selector: 'app-foundation-permission-matrix',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    @media (max-width: 768px) { .page { padding: 16px 12px; } }
    .page-header { margin-bottom: 16px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 4px; }
    .page-sub { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin: 0; max-width: 60ch; }
    .search-bar { margin-bottom: 16px; }
    .search-bar input { width: 100%; max-width: 320px; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); min-height: 40px; }
    .matrix-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 480px; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); position: sticky; top: 0; z-index: 1; }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .role-name { font-weight: 600; white-space: nowrap; }
    .role-code { font-family: monospace; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .perm-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .perm-tag { display: inline-block; padding: 2px 6px; border-radius: var(--radius-sm); font-size: var(--font-size-2xs); font-family: monospace; background: var(--primary-50, #eff6ff); color: var(--primary-700, #1d4ed8); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; margin-inline-start: 6px; }
    .badge.system { background: var(--blue-100); color: var(--blue-700); }
    .empty-state { text-align: center; padding: 40px 16px; color: var(--text-color-secondary); }
    .summary { font-size: var(--font-size-xs); color: var(--text-color-secondary); margin-bottom: 12px; }
    .error-card { background: var(--red-50, #fef2f2); border: 1px solid var(--red-200); color: var(--red-700); padding: 14px 16px; border-radius: var(--radius-md); margin-bottom: 16px; }
    .error-card .req-id { display: block; font-family: var(--font-family-mono, monospace); font-size: var(--font-size-xs); color: var(--text-color-secondary); margin-top: 4px; }
    .error-card .actions { margin-top: 8px; }
    .btn-secondary { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; color: var(--text-color); }
    .skel { background: linear-gradient(90deg, var(--surface-200), var(--surface-100), var(--surface-200)); background-size: 200% 100%; animation: skel 1.2s ease-in-out infinite; border-radius: var(--radius-sm); height: 14px; }
    @keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .skel-row { display: flex; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--surface-border); }
    .skel-cell { flex: 1; } .skel-wide { flex: 2; }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/permission-matrix'" [titleKey]="'foundation.nav.permissionMatrix'" [showRail]="true">
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <h2 class="page-title">{{ i18n.t('permissionMatrix.title') }}</h2>
        <p class="page-sub">{{ i18n.t('permissionMatrix.subtitle') }}</p>
      </header>

      @if (error()) {
        <div class="error-card" role="alert" aria-live="assertive">
          <strong>{{ i18n.t('permissionMatrix.loadFailed') }}</strong>
          <div>{{ error() }}</div>
          @if (errorRequestId()) {
            <span class="req-id">{{ i18n.t('permissionMatrix.requestId') }}: {{ errorRequestId() }}</span>
          }
          <div class="actions">
            <button type="button" class="btn-secondary" (click)="load()">{{ i18n.t('permissionMatrix.retry') }}</button>
          </div>
        </div>
      }

      <div class="search-bar">
        <label class="sr-only" for="perm-search">{{ i18n.t('permissionMatrix.searchPlaceholder') }}</label>
        <input id="perm-search" type="search" [(ngModel)]="searchTerm"
          [placeholder]="i18n.t('permissionMatrix.searchPlaceholder')" (input)="applyFilter()" />
      </div>

      @if (loading()) {
        <div class="matrix-card" aria-busy="true">
          @for (_ of skeletonRows; track $index) {
            <div class="skel-row" aria-hidden="true">
              <div class="skel skel-cell"></div><div class="skel skel-cell"></div><div class="skel skel-wide"></div>
            </div>
          }
        </div>
      } @else if (error()) {
        <!-- Error already shown in the card above; deliberately NOT rendering any rows -->
      } @else if (filtered().length === 0) {
        <div class="empty-state">{{ i18n.t('permissionMatrix.noData') }}</div>
      } @else {
        <div class="summary">{{ i18n.t('permissionMatrix.summary', { roles: i18n.formatNumber(filtered().length), perms: i18n.formatNumber(allPerms().length) }) }}</div>
        <div class="matrix-card">
          <table>
            <thead>
              <tr>
                <th scope="col">{{ i18n.t('permissionMatrix.tableRole') }}</th>
                <th scope="col">{{ i18n.t('permissionMatrix.tableCode') }}</th>
                <th scope="col">{{ i18n.t('permissionMatrix.tablePerms') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.roleCode) {
                <tr>
                  <td class="role-name">
                    {{ row.role }}
                    @if (row.isSystem) { <span class="badge system">{{ i18n.t('permissionMatrix.systemBadge') }}</span> }
                  </td>
                  <td class="role-code">{{ row.roleCode }}</td>
                  <td>
                    <div class="perm-list">
                      @for (p of row.permissions; track p) { <span class="perm-tag">{{ p }}</span> }
                      @if (row.permissions.length === 0) {
                        <span style="color:var(--text-color-secondary);font-size:var(--font-size-xs)">{{ i18n.t('permissionMatrix.noPermissions') }}</span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationPermissionMatrixComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true);
  error = signal<string | null>(null);
  errorRequestId = signal<string | null>(null);
  rows = signal<PermRow[]>([]);
  filtered = signal<PermRow[]>([]);
  allPerms = computed(() => {
    const s = new Set<string>();
    for (const r of this.rows()) { for (const p of r.permissions) s.add(p); }
    return [...s].sort();
  });
  searchTerm = '';
  skeletonRows = Array.from({ length: 6 });

  ngOnInit(): void { this.load(); }

  /**
   * Single entry point for (re)loading the matrix. Any failure — either
   * loading the role list OR loading the per-role permissions — clears the
   * view and surfaces an explicit error state. No silent fallbacks, no
   * hardcoded inline permissions.
   */
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.errorRequestId.set(null);
    this.rows.set([]);
    this.filtered.set([]);

    this.api.getFoundationRoles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        const roles = normalizeFoundationRoles(res);
        if (roles.length === 0) {
          this.loading.set(false);
          return;
        }

        const requests: Record<string, ReturnType<FoundationApiService['getRolePermissions']>> = {};
        for (const r of roles) {
          const code = r.code || r.id || '';
          if (code) requests[code] = this.api.getRolePermissions(code);
        }
        if (Object.keys(requests).length === 0) {
          this.loading.set(false);
          return;
        }

        forkJoin(requests).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (permResults) => {
            const built: PermRow[] = roles.map((r) => {
              const code = r.code || r.id || '';
              return {
                role: r.name_en || code,
                roleCode: code,
                isSystem: r.is_system === true,
                permissions: normalizeRolePermissions(permResults[code]),
              };
            });
            this.rows.set(built);
            this.applyFilter();
            this.loading.set(false);
          },
          error: (err: unknown) => {
            // No silent fallback to inline r.permissions — surface the failure.
            this.error.set(FoundationApiService.formatLoadError(err));
            this.errorRequestId.set(this.extractRequestId(err));
            this.rows.set([]);
            this.filtered.set([]);
            this.loading.set(false);
          },
        });
      },
      error: (err: unknown) => {
        this.error.set(FoundationApiService.formatLoadError(err));
        this.errorRequestId.set(this.extractRequestId(err));
        this.rows.set([]);
        this.filtered.set([]);
        this.loading.set(false);
      },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) { this.filtered.set(this.rows()); return; }
    this.filtered.set(this.rows().filter((r) =>
      r.role.toLowerCase().includes(term) ||
      r.roleCode.toLowerCase().includes(term) ||
      r.permissions.some((p) => p.toLowerCase().includes(term)),
    ));
  }

  private extractRequestId(err: unknown): string | null {
    if (err instanceof HttpErrorResponse) {
      const headerId = err.headers?.get('x-request-id') || err.headers?.get('X-Request-Id');
      if (headerId) return headerId;
      const body = err.error as Record<string, unknown> | undefined;
      const fromBody = body?.['requestId'] || body?.['request_id'] || body?.['correlationId'];
      if (typeof fromBody === 'string') return fromBody;
    }
    return null;
  }

  // Retained to make the import list stable during the transition; no silent fallback emits here.
  private readonly _noFallback = of(null);
}
