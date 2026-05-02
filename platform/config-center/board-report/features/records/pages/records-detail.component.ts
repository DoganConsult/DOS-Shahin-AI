import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { RecordsApiService, RecordDto } from '../services/records-api.service';
import { I18nService } from '@app/infrastructure';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-records-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="detail-shell" [dir]="i18n.direction()">
      <div class="detail-header">
        <a routerLink=".." class="back-link"><i class="pi pi-arrow-left"></i> Back to Records</a>
        <h1 *ngIf="record()">{{ record()?.title }}</h1>
      </div>
      <div *ngIf="loading()" class="loading-state">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </div>
      <div *ngIf="!loading() && record()" class="detail-content">
        <div class="info-grid">
          <div class="info-field">
            <label>Status</label>
            <span class="status-badge" [attr.data-status]="record()?.status">{{ record()?.status }}</span>
          </div>
          <div class="info-field">
            <label>Type</label>
            <span>{{ record()?.recordType }}</span>
          </div>
          <div class="info-field">
            <label>Classification</label>
            <span>{{ record()?.classification || 'Unclassified' }}</span>
          </div>
          <div class="info-field">
            <label>Legal Hold</label>
            <span [class.hold-active]="record()?.legalHold">{{ record()?.legalHold ? 'Active' : 'None' }}</span>
          </div>
          <div class="info-field">
            <label>Retention</label>
            <span>{{ record()?.retentionPeriod }} {{ record()?.retentionUnit }}</span>
          </div>
          <div class="info-field">
            <label>Owner</label>
            <span>{{ record()?.ownerName || record()?.ownerId || 'Unassigned' }}</span>
          </div>
        </div>
        <div class="description-section" *ngIf="record()?.description">
          <label>Description</label>
          <p>{{ record()?.description }}</p>
        </div>
        <div class="actions-bar">
          <button class="btn-secondary" (click)="onTransition('under_review')">Submit for Review</button>
          <button class="btn-secondary" (click)="onTransition('archived')">Archive</button>
        </div>
      </div>
      <div *ngIf="!loading() && !record()" class="not-found">Record not found.</div>
    </div>
  `,
  styles: [`
    .detail-shell { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .detail-header { margin-bottom: 24px; }
    .back-link { color: var(--primary); text-decoration: none; font-size: var(--font-size-base); display: inline-flex; align-items: center; gap: 4px; margin-bottom: 12px; }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .loading-state { display: flex; flex-direction: column; gap: 12px; }
    .skeleton { height: 48px; background: var(--surface-hover, #f3f4f6); border-radius: var(--radius); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .detail-content { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .info-field { display: flex; flex-direction: column; gap: 4px; }
    .info-field label { font-size: var(--font-size-sm); color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .info-field span { font-size: var(--font-size-body-sm); color: var(--text-heading); }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: var(--radius-sm); font-size: var(--font-size-caption); font-weight: 500; background: var(--blue-50, #eff6ff); color: var(--blue-700, #1d4ed8); }
    .hold-active { color: var(--red-600, #dc2626); font-weight: 600; }
    .description-section { margin-bottom: 24px; }
    .description-section label { font-size: var(--font-size-sm); color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 8px; }
    .description-section p { margin: 0; font-size: var(--font-size-body-sm); line-height: 1.6; }
    .actions-bar { display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 16px; }
    .btn-secondary { padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); cursor: pointer; font-size: var(--font-size-base); }
    .btn-secondary:hover { background: var(--surface-hover, #f3f4f6); }
    .not-found { text-align: center; padding: 48px; color: var(--text-color-secondary); }
  `],
})
export class RecordsDetailComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private api = inject(RecordsApiService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  record = signal<RecordDto | null>(null);

  ngOnInit(): void {
    this.route.params.pipe(
      switchMap(p => this.api.get(p['id']).pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(r => {
      this.record.set(r);
      this.loading.set(false);
    });
  }

  onTransition(status: string): void {
    const r = this.record();
    if (!r) return;
    this.api.transition(r.id, status).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of(null)),
    ).subscribe(updated => {
      if (updated) this.record.set(updated);
    });
  }
}
