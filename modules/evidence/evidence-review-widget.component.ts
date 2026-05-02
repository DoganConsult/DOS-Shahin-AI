import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'evidence-review-widget',
  standalone: true,
  imports: [CommonModule, AppDatePipe, TagModule, ButtonModule, TooltipModule],
  template: `
    <div class="widget">
      <div class="widget-header">
        <h3>{{ i18n.translate('evidenceReviewWidget.title') }}</h3>
        <span class="badge" *ngIf="evidence?.length">{{ evidence.length }}</span>
      </div>

      <!-- Loading skeleton -->
      <div class="skel" *ngIf="loading">
        <div class="skel-row" *ngFor="let x of [1,2,3]"></div>
      </div>

      <ng-container *ngIf="!loading">
        <div class="review-list" *ngIf="evidence?.length; else noEvidence">
          <div class="review-row" *ngFor="let e of evidence | slice:0:5">
            <div class="review-info">
              <span class="review-title">{{ e.title || e.type }}</span>
              <span class="review-meta">{{ e.submitted_by_name || (e.submitted_by | slice:0:10) }} &middot; {{ e.created_at | appDate:'short' }}</span>
            </div>
            <p-tag [value]="e.status" [severity]="e.status === 'pending' ? 'warning' : 'info'" styleClass="review-tag" />
            <div class="review-actions">
              <p-button icon="pi pi-check" size="small" [text]="true" severity="success" (onClick)="approveRequested.emit(e)" pTooltip="Approve" />
              <p-button icon="pi pi-times" size="small" [text]="true" severity="danger" (onClick)="rejectRequested.emit(e)" pTooltip="Reject" />
            </div>
          </div>
        </div>
        <ng-template #noEvidence>
          <div class="empty">{{ i18n.translate('evidenceReviewWidget.noEvidence') }}</div>
        </ng-template>
        <div class="widget-footer" *ngIf="((evidence ?? []).length) > 5">+ {{ (evidence ?? []).length - 5 }} {{ i18n.translate('evidenceReviewWidget.pendingCount') }}</div>
      </ng-container>
    </div>
  `,
  styles: [`
    .widget { padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); min-width: 280px; flex: 1; }
    .widget-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .widget-header h3 { font-size: var(--font-size-base); font-weight: 700; margin: 0; color: var(--text-heading, #111); flex:1; }
    .badge { background: var(--primary); color: #fff; font-size: var(--font-size-xs); font-weight: 700; min-width: 22px; height: 22px; border-radius: 11px; display: flex; align-items: center; justify-content: center; padding: 0 6px; }
    .review-list { display: flex; flex-direction: column; gap: 6px; }
    .review-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--surface-ground, #f9fafb); }
    .review-info { flex: 1; min-width: 0; }
    .review-title { font-size: var(--font-size-sm); font-weight: 600; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .review-meta { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .review-actions { display: flex; gap: 2px; }
    .empty { font-size: var(--font-size-sm); color: var(--text-muted, #9ca3af); text-align: center; padding: 12px; }
    .widget-footer { margin-top: 8px; font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); font-weight: 600; }
    .skel { display:flex; flex-direction:column; gap:6px; }
    .skel-row { height:36px; background:var(--border-subtle); border-radius:var(--radius-sm); animation: skelPulse 1.5s ease-in-out infinite; }
    @keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  `]
})
export class EvidenceReviewWidgetComponent {
  i18n = inject(I18nService);
  @Input() evidence: GrcRecord[] = [];
  @Input() loading: boolean = false;
  @Output() approveRequested = new EventEmitter<unknown>();
  @Output() rejectRequested = new EventEmitter<unknown>();
}
