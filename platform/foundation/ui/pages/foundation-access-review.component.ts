import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface Campaign { id?: string; name?: string; status?: string; scope?: string; reviewer_name?: string; created_at?: string; due_date?: string; item_count?: number; [k: string]: unknown; }

@Component({
  selector: 'app-foundation-access-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0; }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
    .btn-icon { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: var(--font-size-xs); margin-inline-start: 4px; }
    .btn-icon.danger { color: var(--red-500); border-color: var(--red-200); }
    .btn-icon.success { color: var(--green-700); border-color: var(--green-200); }
    .filters { display: flex; gap: 8px; margin-bottom: 16px; }
    .filters select { padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; }
    .badge.draft { background: var(--surface-section); color: var(--text-color-secondary); }
    .badge.in_progress { background: var(--blue-100); color: var(--blue-700); }
    .badge.completed { background: var(--green-100); color: var(--green-700); }
    .badge.cancelled { background: var(--red-100); color: var(--red-700); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--surface-overlay); border-radius: var(--radius-lg); padding: 24px; min-width: 400px; max-width: 540px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
    .modal-title { font-size: var(--font-size-lg); font-weight: 600; margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); box-sizing: border-box; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .btn-cancel { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/access-review'" [titleKey]="'foundation.nav.accessReview'" [showRail]="true">
    <div class="page" [dir]="i18n.direction()">
      <div class="page-header">
        <h2 class="page-title">{{ i18n.tr('nav.foundationAccessReview', 'Access Review Campaigns') }}</h2>
        <button class="btn-primary" (click)="openCreate()">+ New Campaign</button>
      </div>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="filters">
        <select [(ngModel)]="statusFilter" (change)="load()">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div class="table-card">
        @if (loading()) { <div class="empty-state">Loading…</div> }
        @else if (items().length === 0) { <div class="empty-state">No campaigns found.</div> }
        @else {
          <table class="responsive-stack">
            <thead><tr><th>Name</th><th>Scope</th><th>Reviewer</th><th>Items</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (c of items(); track c.id) {
                <tr>
                  <td data-label="Name">{{ c.name || '—' }}</td>
                  <td data-label="Scope">{{ c.scope || '—' }}</td>
                  <td data-label="Reviewer">{{ c.reviewer_name || '—' }}</td>
                  <td data-label="Items">{{ c.item_count ?? '—' }}</td>
                  <td data-label="Due">{{ c.due_date || '—' }}</td>
                  <td data-label="Status"><span class="badge" [class.draft]="c.status === 'draft'" [class.in_progress]="c.status === 'in_progress'" [class.completed]="c.status === 'completed'" [class.cancelled]="c.status === 'cancelled'">{{ c.status || 'draft' }}</span></td>
                  <td data-label="Actions">
                    @if (c.status === 'draft') {
                      <button class="btn-icon success" (click)="startCampaign(c)" [disabled]="isStarting(c)">{{ isStarting(c) ? 'Starting…' : 'Start' }}</button>
                    }
                    <button class="btn-icon danger" (click)="confirmDelete(c)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
      @if (showDialog()) {
        <div class="modal-overlay" (click)="closeDialog()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 class="modal-title">New Access Review Campaign</h3>
            <div class="form-group"><label>Campaign Name *</label><input [(ngModel)]="form['name']" /></div>
            <div class="form-group"><label>Scope</label><input [(ngModel)]="form['scope']" placeholder="e.g. all-users, department-finance" /></div>
            <div class="form-group"><label>Due Date</label><input type="date" [(ngModel)]="form['due_date']" /></div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="closeDialog()">Cancel</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Creating…' : 'Create' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationAccessReviewComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  loading = signal(true); saving = signal(false); error = signal<string | null>(null);
  showDialog = signal(false); items = signal<Campaign[]>([]);
  statusFilter = ''; form: Record<string, string> = {};
  /** Per-campaign in-flight guard — prevents double-PUT on rapid clicks of the Start button. */
  private startingCampaigns = signal<Set<string>>(new Set());

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.api.getAccessReviewCampaigns(this.statusFilter || undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { this.items.set((res.campaigns ?? []) as Campaign[]); this.loading.set(false); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }
  openCreate(): void { this.form = {}; this.showDialog.set(true); }
  closeDialog(): void { this.showDialog.set(false); }
  save(): void {
    if (!this.form['name']?.trim()) { this.error.set('Campaign name is required.'); return; }
    this.saving.set(true);
    this.api.createAccessReviewCampaign(this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.closeDialog(); this.load(); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.saving.set(false); },
    });
  }
  isStarting(c: Campaign): boolean {
    return !!c.id && this.startingCampaigns().has(c.id);
  }
  startCampaign(c: Campaign): void {
    if (!c.id) return;
    // Client-side idempotency guard: ignore re-clicks while a PUT is in flight
    // for this campaign id. Backend `PUT /campaigns/:id/start` is also SQL-idempotent
    // (`UPDATE … SET status='open' WHERE deleted_at IS NULL`), but this avoids
    // duplicate audit-trail rows from multi-click double-submission.
    if (this.startingCampaigns().has(c.id)) return;
    if (!confirm(`Start campaign "${c.name}"?`)) return;
    const id = c.id;
    this.startingCampaigns.update((s) => { const n = new Set(s); n.add(id); return n; });
    const release = (): void => {
      this.startingCampaigns.update((s) => { const n = new Set(s); n.delete(id); return n; });
    };
    this.api.startCampaign(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { release(); this.load(); },
      error: (err) => { release(); this.error.set(FoundationApiService.formatLoadError(err)); },
    });
  }
  confirmDelete(c: Campaign): void {
    if (!c.id || !confirm(`Delete campaign "${c.name}"?`)) return;
    this.api.deleteCampaign(c.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load(), error: (err) => this.error.set(FoundationApiService.formatLoadError(err)) });
  }
}
