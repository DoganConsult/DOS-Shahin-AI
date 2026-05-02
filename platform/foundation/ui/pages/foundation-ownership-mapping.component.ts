import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface Owner { id?: string; user_id?: string; user_name?: string; email?: string; role?: string; entity_id?: string; entity_name?: string; [k: string]: unknown; }

const DOMAINS = ['organizations', 'departments', 'business_units', 'positions', 'committees', 'policies', 'assets'] as const;

@Component({
  selector: 'app-foundation-ownership-mapping',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .domain-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .domain-tab { padding: 6px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); cursor: pointer; font-size: var(--font-size-sm); text-transform: capitalize; }
    .domain-tab.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
    .btn-icon { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: var(--font-size-xs); margin-inline-start: 4px; }
    .btn-icon.danger { color: var(--red-500); border-color: var(--red-200); }
    .header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--surface-overlay); border-radius: var(--radius-lg); padding: 24px; min-width: 400px; max-width: 540px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
    .modal-title { font-size: var(--font-size-lg); font-weight: 600; margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); box-sizing: border-box; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .btn-cancel { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/ownership-mapping'" [titleKey]="'foundation.nav.ownershipMapping'">
    <div class="page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ ownershipTitle() }}</h2>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="domain-tabs">
        @for (d of domains; track d) {
          <button class="domain-tab" [class.active]="selectedDomain() === d" (click)="selectDomain(d)">{{ d.replace('_', ' ') }}</button>
        }
      </div>
      @if (selectedDomain()) {
        <div class="header-row">
          <span style="font-weight:600;text-transform:capitalize">{{ selectedDomain()!.replace('_', ' ') }} Owners</span>
          <button class="btn-primary" (click)="openAssign()">+ Assign Owner</button>
        </div>
        <div class="table-card">
          @if (loading()) { <div class="empty-state">Loading…</div> }
          @else if (owners().length === 0) { <div class="empty-state">No owners assigned for this domain.</div> }
          @else {
            <table class="responsive-stack">
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Entity</th><th>Actions</th></tr></thead>
              <tbody>
                @for (o of owners(); track o.id ?? o.user_id) {
                  <tr>
                    <td data-label="User">{{ o.user_name || '—' }}</td>
                    <td data-label="Email">{{ o.email || '—' }}</td>
                    <td data-label="Role">{{ o.role || '—' }}</td>
                    <td data-label="Entity">{{ o.entity_name || o.entity_id || '—' }}</td>
                    <td data-label="Actions"><button class="btn-icon danger" (click)="confirmRemove(o)">Remove</button></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
      @if (showDialog()) {
        <div class="modal-overlay" (click)="closeDialog()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 class="modal-title">Assign Owner</h3>
            <div class="form-group"><label>User ID *</label><input [(ngModel)]="form.user_id" placeholder="Enter user UUID" /></div>
            <div class="form-group"><label>Entity ID</label><input [(ngModel)]="form.entity_id" placeholder="Optional — scoped to entity" /></div>
            <div class="form-group"><label>Role</label><input [(ngModel)]="form.role" placeholder="e.g. owner, steward, custodian" /></div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="closeDialog()">Cancel</button>
              <button class="btn-primary" (click)="assign()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Assign' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationOwnershipMappingComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  readonly domains = DOMAINS;
  loading = signal(false); saving = signal(false); error = signal<string | null>(null);
  showDialog = signal(false); selectedDomain = signal<string | null>(null);
  owners = signal<Owner[]>([]); form: Record<string, string> = {};

  ownershipTitle(): string {
    return this.i18n.tr('nav.foundationOwnership', this.i18n.direction() === 'rtl' ? 'خريطة الملكية' : 'Ownership Mapping');
  }

  ngOnInit(): void { this.selectDomain(this.domains[0]); }
  selectDomain(d: string): void {
    this.selectedDomain.set(d); this.loading.set(true);
    this.api.getOwnershipByDomain(d).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { this.owners.set((res.owners ?? []) as Owner[]); this.loading.set(false); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }
  openAssign(): void { this.form = {}; this.showDialog.set(true); }
  closeDialog(): void { this.showDialog.set(false); }
  assign(): void {
    if (!this.form['user_id']?.trim()) { this.error.set('User ID is required.'); return; }
    this.saving.set(true);
    this.api.assignOwner(this.selectedDomain()!, this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.closeDialog(); this.selectDomain(this.selectedDomain()!); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.saving.set(false); },
    });
  }
  confirmRemove(o: Owner): void {
    const id = o.id || o.user_id;
    if (!id || !confirm(`Remove owner "${o.user_name || o.email || id}"?`)) return;
    this.api.removeOwner(this.selectedDomain()!, id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.selectDomain(this.selectedDomain()!),
      error: (err) => this.error.set(FoundationApiService.formatLoadError(err)),
    });
  }
}
