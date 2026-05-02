import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface AuditEntry { id?: string; action?: string; entity_type?: string; entity_id?: string; actor_name?: string; actor_id?: string; module?: string; created_at?: string; details?: string; [k: string]: unknown; }

@Component({
  selector: 'app-foundation-audit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .filters select, .filters input { padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; background: var(--surface-section); color: var(--text-color-secondary); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .pagination button { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 12px; cursor: pointer; font-size: var(--font-size-xs); }
    .pagination button:disabled { opacity: .4; cursor: default; }
    .mono { font-family: monospace; font-size: var(--font-size-xs); }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/audit'" [titleKey]="'foundation.nav.audit'" [showRail]="true">
    <div class="page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.tr('nav.foundationAudit', 'Foundation Audit Trail') }}</h2>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="filters">
        <select [(ngModel)]="moduleFilter" (change)="load()">
          <option value="">All modules</option>
          <option value="foundation">Foundation</option>
          <option value="governance">Governance</option>
          <option value="compliance">Compliance</option>
          <option value="risk">Risk</option>
        </select>
        <input type="date" [(ngModel)]="fromDate" (change)="load()" />
      </div>
      <div class="table-card">
        @if (loading()) { <div class="empty-state">Loading…</div> }
        @else if (items().length === 0) { <div class="empty-state">No audit entries found.</div> }
        @else {
          <table class="responsive-stack">
            <thead><tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>Actor</th><th>Module</th><th>Details</th></tr></thead>
            <tbody>
              @for (e of items(); track e.id ?? $index) {
                <tr>
                  <td data-label="Timestamp" class="mono">{{ e.created_at || '—' }}</td>
                  <td data-label="Action"><span class="badge">{{ e.action || '—' }}</span></td>
                  <td data-label="Entity">{{ e.entity_type || '—' }} <span class="mono">{{ e.entity_id ? '(' + e.entity_id.substring(0, 8) + '…)' : '' }}</span></td>
                  <td data-label="Actor">{{ e.actor_name || e.actor_id || '—' }}</td>
                  <td data-label="Module">{{ e.module || '—' }}</td>
                  <td data-label="Details">{{ e.details || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <span>Showing {{ items().length }} entries (offset {{ offset }})</span>
            <div>
              <button (click)="prevPage()" [disabled]="offset <= 0">Prev</button>
              <button (click)="nextPage()" [disabled]="items().length < limit">Next</button>
            </div>
          </div>
        }
      </div>
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationAuditComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  loading = signal(true); error = signal<string | null>(null);
  items = signal<AuditEntry[]>([]); moduleFilter = 'foundation'; fromDate = '';
  offset = 0; limit = 50;

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.api.getAuditTrail({ module: this.moduleFilter || undefined, limit: this.limit, offset: this.offset, from: this.fromDate || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : (res?.entries ?? res?.rows ?? res?.data ?? []);
          this.items.set(list as AuditEntry[]);
          this.loading.set(false);
        },
        error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
      });
  }
  prevPage(): void { if (this.offset >= this.limit) { this.offset -= this.limit; this.load(); } }
  nextPage(): void { this.offset += this.limit; this.load(); }
}
