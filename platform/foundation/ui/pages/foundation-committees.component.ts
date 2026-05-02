import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface Committee { id?: string; name?: string; name_en?: string; type?: string; status?: string; chair_name?: string; member_count?: number; [k: string]: unknown; }

@Component({
  selector: 'app-foundation-committees',
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
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; }
    .badge.active { background: var(--green-100); color: var(--green-700); }
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
    <foundation-page-shell [route]="'/foundation/committees'" [titleKey]="'foundation.nav.committees'" [showRail]="true">
    <div class="page" [dir]="i18n.direction()">
      <div class="page-header">
        <h2 class="page-title">Committees</h2>
        <button class="btn-primary" (click)="openCreate()">+ Add Committee</button>
      </div>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="table-card">
        @if (loading()) { <div class="empty-state">Loading…</div> }
        @else if (items().length === 0) { <div class="empty-state">No committees found.</div> }
        @else {
          <table class="responsive-stack">
            <thead><tr><th>Name</th><th>Type</th><th>Chair</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (c of items(); track c.id) {
                <tr>
                  <td data-label="Name">{{ c.name || c.name_en || '—' }}</td>
                  <td data-label="Type">{{ c.type || '—' }}</td>
                  <td data-label="Chair">{{ c.chair_name || '—' }}</td>
                  <td data-label="Members">{{ c.member_count ?? 0 }}</td>
                  <td data-label="Status"><span class="badge" [class.active]="c.status === 'active'">{{ c.status || 'active' }}</span></td>
                  <td data-label="Actions">
                    <button class="btn-icon" (click)="openEdit(c)">Edit</button>
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
            <h3 class="modal-title">{{ editing() ? 'Edit Committee' : 'New Committee' }}</h3>
            <div class="form-group"><label>Name *</label><input [(ngModel)]="form.name" /></div>
            <div class="form-group"><label>Type</label><input [(ngModel)]="form.type" placeholder="e.g. steering, advisory" /></div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="closeDialog()">Cancel</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationCommitteesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  loading = signal(true); saving = signal(false); error = signal<string | null>(null);
  showDialog = signal(false); editing = signal<Committee | null>(null);
  items = signal<Committee[]>([]); form: Partial<Committee> = {};

  ngOnInit(): void { this.load(); }
  private load(): void {
    this.loading.set(true);
    this.api.getCommittees().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { this.items.set((res.committees ?? []) as Committee[]); this.loading.set(false); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }
  openCreate(): void { this.editing.set(null); this.form = {}; this.showDialog.set(true); }
  openEdit(c: Committee): void { this.editing.set(c); this.form = { name: c.name || c.name_en, type: c.type }; this.showDialog.set(true); }
  closeDialog(): void { this.showDialog.set(false); this.editing.set(null); }
  save(): void {
    if (!this.form.name?.trim()) { this.error.set('Name is required.'); return; }
    this.saving.set(true);
    const t = this.editing();
    const obs$ = t?.id ? this.api.updateCommittee(t.id, this.form) : this.api.createCommittee(this.form);
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.closeDialog(); this.load(); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.saving.set(false); },
    });
  }
  confirmDelete(c: Committee): void {
    if (!c.id || !confirm(`Delete "${c.name || c.name_en}"?`)) return;
    this.api.deleteCommittee(c.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load(), error: (err) => this.error.set(FoundationApiService.formatLoadError(err)) });
  }
}
