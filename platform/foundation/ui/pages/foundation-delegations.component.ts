import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface Delegation { id?: string; delegator_name?: string; delegate_name?: string; delegation_type?: string; status?: string; expires_at?: string; scope?: string; [k: string]: unknown; }

@Component({
  selector: 'app-foundation-delegations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FoundationPageShellComponent],
  styles: [`
    .page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; }
    .badge.active { background: var(--green-100); color: var(--green-700); }
    .badge.expired { background: var(--red-100); color: var(--red-700); }
    .badge.pending { background: var(--yellow-100); color: var(--yellow-700); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .btn-sm { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: var(--font-size-xs); margin-inline-start: 4px; }
    .btn-sm.danger { color: var(--red-500); border-color: var(--red-200); }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/delegations'" [titleKey]="'foundation.nav.delegations'" [showRail]="true">
    <div class="page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('foundation.nav.delegations') }}</h2>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="table-card">
        @if (loading()) { <div class="empty-state">{{ i18n.translate('foundation.module.loading') }}</div> }
        @else if (items().length === 0) { <div class="empty-state">{{ i18n.translate('foundation.delegations.empty') }}</div> }
        @else {
          <table class="responsive-stack">
            <thead><tr>
              <th>{{ i18n.translate('foundation.delegations.delegator') }}</th>
              <th>{{ i18n.translate('foundation.delegations.delegate') }}</th>
              <th>{{ i18n.translate('foundation.delegations.type') }}</th>
              <th>{{ i18n.translate('foundation.delegations.scope') }}</th>
              <th>{{ i18n.translate('foundation.delegations.expires') }}</th>
              <th>{{ i18n.translate('foundation.fields.status') }}</th>
              <th>{{ i18n.translate('foundation.delegations.actions') }}</th>
            </tr></thead>
            <tbody>
              @for (d of items(); track d.id) {
                <tr>
                  <td [attr.data-label]="i18n.translate('foundation.delegations.delegator')">{{ d.delegator_name || '—' }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.delegations.delegate')">{{ d.delegate_name || '—' }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.delegations.type')">{{ d.delegation_type || '—' }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.delegations.scope')">{{ d.scope || '—' }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.delegations.expires')">{{ d.expires_at ? (d.expires_at | date:'mediumDate') : i18n.translate('foundation.delegations.noExpiry') }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.fields.status')"><span class="badge" [class.active]="d.status === 'active'" [class.expired]="d.status === 'expired'" [class.pending]="d.status === 'pending'">{{ i18n.translate('foundation.status.' + d.status) }}</span></td>
                  <td [attr.data-label]="i18n.translate('foundation.delegations.actions')">
                    @if (d.status === 'active') { <button class="btn-sm danger" (click)="revoke(d)">{{ i18n.translate('foundation.actions.revoke') }}</button> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationDelegationsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  loading = signal(true); error = signal<string | null>(null);
  items = signal<Delegation[]>([]);

  ngOnInit(): void { this.load(); }
  private load(): void {
    this.loading.set(true);
    this.api.getDelegations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { this.items.set((res.delegations ?? []) as Delegation[]); this.loading.set(false); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }
  revoke(d: Delegation): void {
    if (!d.id || !confirm('Revoke this delegation?')) return;
    this.api.revokeDelegation(d.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load(), error: (err) => this.error.set(FoundationApiService.formatLoadError(err)) });
  }
}
