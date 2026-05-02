import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface DPA { id?: string; name?: string; purpose?: string; legal_basis?: string; data_subjects?: string; status?: string; owner_name?: string; [k: string]: unknown; }

@Component({
  selector: 'app-foundation-data-processing',
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
    .badge.draft { background: var(--yellow-100); color: var(--yellow-700); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--surface-overlay); border-radius: var(--radius-lg); padding: 24px; min-width: 400px; max-width: 540px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
    .modal-title { font-size: var(--font-size-lg); font-weight: 600; margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); box-sizing: border-box; }
    .form-group textarea { min-height: 60px; resize: vertical; font-family: inherit; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .btn-cancel { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/data-processing'" [titleKey]="'foundation.nav.dataProcessing'">
    <div class="page" [dir]="i18n.direction()">
      <div class="page-header">
        <h2 class="page-title">{{ i18n.tr('nav.foundationDataProcessing', 'Data Processing Activities (ROPA)') }}</h2>
        <button class="btn-primary" (click)="openCreate()">+ Add Activity</button>
      </div>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="table-card">
        @if (loading()) { <div class="empty-state">Loading…</div> }
        @else if (items().length === 0) { <div class="empty-state">No data processing activities found.</div> }
        @else {
          <table class="responsive-stack">
            <thead><tr><th>Name</th><th>Purpose</th><th>Legal Basis</th><th>Data Subjects</th><th>Owner</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (a of items(); track a.id) {
                <tr>
                  <td data-label="Name">{{ a.name || '—' }}</td>
                  <td data-label="Purpose">{{ a.purpose || '—' }}</td>
                  <td data-label="Legal Basis">{{ a.legal_basis || '—' }}</td>
                  <td data-label="Data Subjects">{{ a.data_subjects || '—' }}</td>
                  <td data-label="Owner">{{ a.owner_name || '—' }}</td>
                  <td data-label="Status"><span class="badge" [class.active]="a.status === 'active'" [class.draft]="a.status === 'draft'">{{ a.status || 'draft' }}</span></td>
                  <td data-label="Actions">
                    <button class="btn-icon" (click)="openEdit(a)">Edit</button>
                    <button class="btn-icon danger" (click)="confirmDelete(a)">Delete</button>
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
            <h3 class="modal-title">{{ editing() ? 'Edit Activity' : 'New Activity' }}</h3>
            <div class="form-group"><label>Name *</label><input [(ngModel)]="form.name" /></div>
            <div class="form-group"><label>Purpose</label><textarea [(ngModel)]="form.purpose"></textarea></div>
            <div class="form-group"><label>Legal Basis</label><input [(ngModel)]="form.legal_basis" placeholder="e.g. Consent, Contract, Legal Obligation" /></div>
            <div class="form-group"><label>Data Subjects</label><input [(ngModel)]="form.data_subjects" placeholder="e.g. Employees, Customers" /></div>
            <div class="form-group"><label>Status</label>
              <select [(ngModel)]="form.status"><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select>
            </div>
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
export class FoundationDataProcessingComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  loading = signal(true); saving = signal(false); error = signal<string | null>(null);
  showDialog = signal(false); editing = signal<DPA | null>(null);
  items = signal<DPA[]>([]); form: Partial<DPA> = { status: 'draft' };

  ngOnInit(): void { this.load(); }
  private load(): void {
    this.loading.set(true);
    this.api.getDataProcessingActivities().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { const list = Array.isArray(res) ? res : (res?.activities ?? res?.data ?? res?.rows ?? []); this.items.set(list as DPA[]); this.loading.set(false); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }
  openCreate(): void { this.editing.set(null); this.form = { status: 'draft' }; this.showDialog.set(true); }
  openEdit(a: DPA): void { this.editing.set(a); this.form = { name: a.name, purpose: a.purpose, legal_basis: a.legal_basis, data_subjects: a.data_subjects, status: a.status }; this.showDialog.set(true); }
  closeDialog(): void { this.showDialog.set(false); this.editing.set(null); }
  save(): void {
    if (!this.form.name?.trim()) { this.error.set('Name is required.'); return; }
    this.saving.set(true);
    const t = this.editing();
    const obs$ = t?.id ? this.api.updateDataProcessingActivity(t.id, this.form) : this.api.createDataProcessingActivity(this.form);
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.closeDialog(); this.load(); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.saving.set(false); },
    });
  }
  confirmDelete(a: DPA): void {
    if (!a.id || !confirm(`Delete "${a.name}"?`)) return;
    this.api.deleteDataProcessingActivity(a.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load(), error: (err) => this.error.set(FoundationApiService.formatLoadError(err)) });
  }
}
