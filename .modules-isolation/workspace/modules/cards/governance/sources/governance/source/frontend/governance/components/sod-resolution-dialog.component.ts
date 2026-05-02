/**
 * SoD Resolution Dialog — Dumb sub-component
 * Renders the single-conflict resolve dialog, bulk resolve dialog,
 * details dialog, suggestions dialog, and history dialog for SoD conflicts.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DatePipe, JsonPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TimelineModule } from 'primeng/timeline';
import { GrcRecord } from '@app/core/models/shared.types';

/** Resolve form model */
export interface SodResolveFormModel {
  status: 'mitigated' | 'accepted' | 'resolved';
  resolvedBy: string;
  resolutionNote: string;
}

/** Minimal conflict shape needed by dialogs */
export interface SodConflictDetail {
  conflictId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  conflictType: string;
  scopeType: string;
  scopeId: string;
  scopeName?: string;
  riskScore?: number;
  severity: 'high' | 'medium' | 'low';
  detectedAt: string;
  status: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  details: {
    roleA?: string;
    roleB?: string;
    authorityA?: string;
    authorityB?: string;
    moduleCode?: string;
    severityFactors?: Record<string, unknown>;
    riskFactors?: Record<string, unknown>;
  };
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sod-resolution-dialog',
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, DropdownModule, AccordionModule, TagModule, CardModule, TimelineModule, DatePipe, JsonPipe, DecimalPipe],
    template: `
    <!-- Conflict Details Dialog -->
    <p-dialog
      [visible]="showDetails"
      (visibleChange)="showDetailsChange.emit($event)"
      [header]="i18n.translate('Conflict Details')"
      [modal]="true"
      [style]="{width:'600px'}"
      [dismissableMask]="true">
      <div class="details-content" *ngIf="selectedConflict">
        <div class="detail-row"><strong>{{ i18n.translate('User') }}:</strong><span>{{ selectedConflict.userName || selectedConflict.userEmail || selectedConflict.userId }}</span></div>
        <div class="detail-row"><strong>{{ i18n.translate('Conflict Type') }}:</strong><span>{{ selectedConflict.conflictType }}</span></div>
        <div class="detail-row"><strong>{{ i18n.translate('Scope') }}:</strong><span>{{ selectedConflict.scopeName || selectedConflict.scopeId }} ({{ selectedConflict.scopeType }})</span></div>
        <div class="detail-row">
          <strong>{{ i18n.translate('Severity') }}:</strong>
          <p-tag [value]="selectedConflict.severity" [severity]="selectedConflict.severity === 'high' ? 'danger' : selectedConflict.severity === 'medium' ? 'warning' : 'info'" />
        </div>
        <div class="detail-row" *ngIf="selectedConflict.riskScore !== undefined"><strong>{{ i18n.translate('Risk Score') }}:</strong><span>{{ selectedConflict.riskScore | number:'1.0-0' }}</span></div>
        <div class="detail-row" *ngIf="selectedConflict.details.severityFactors"><strong>{{ i18n.translate('Severity Factors') }}:</strong><pre class="factors-json">{{ selectedConflict.details.severityFactors | json }}</pre></div>
        <div class="detail-row" *ngIf="selectedConflict.details.riskFactors"><strong>{{ i18n.translate('Risk Factors') }}:</strong><pre class="factors-json">{{ selectedConflict.details.riskFactors | json }}</pre></div>
        <div class="detail-row"><strong>{{ i18n.translate('Detected At') }}:</strong><span>{{ selectedConflict.detectedAt | date:'medium' }}</span></div>
        <div class="detail-row" *ngIf="selectedConflict.resolvedAt"><strong>{{ i18n.translate('Resolved At') }}:</strong><span>{{ selectedConflict.resolvedAt | date:'medium' }}</span></div>
        <div class="detail-row" *ngIf="selectedConflict.resolvedBy"><strong>{{ i18n.translate('Resolved By') }}:</strong><span>{{ selectedConflict.resolvedBy }}</span></div>
        <div class="detail-row" *ngIf="selectedConflict.resolutionNote"><strong>{{ i18n.translate('Resolution Note') }}:</strong><p>{{ selectedConflict.resolutionNote }}</p></div>
      </div>
    </p-dialog>

    <!-- Resolve Dialog -->
    <p-dialog
      [visible]="showResolve"
      (visibleChange)="showResolveChange.emit($event)"
      [header]="i18n.translate('Resolve SoD Conflict')"
      [modal]="true"
      [style]="{width:'500px'}"
      [dismissableMask]="true">
      <div class="resolve-form">
        <div class="field">
          <label>{{ i18n.translate('Resolution Status') }}</label>
          <p-dropdown [(ngModel)]="resolveForm.status" [options]="resolveStatusOptions" [placeholder]="i18n.translate('Select status')" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('Resolved By') }}</label>
          <input pInputText [(ngModel)]="resolveForm.resolvedBy" [placeholder]="i18n.translate('User ID or email')" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('Resolution Note') }}</label>
          <textarea pInputTextarea [(ngModel)]="resolveForm.resolutionNote" [rows]="4" [placeholder]="i18n.translate('Optional resolution notes...')"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('Cancel')" icon="pi pi-times" styleClass="p-button-text" (onClick)="showResolveChange.emit(false)" />
        <p-button [label]="i18n.translate('Resolve')" icon="pi pi-check" (onClick)="confirmResolve.emit(resolveForm)" [loading]="resolving" />
      </ng-template>
    </p-dialog>

    <!-- Bulk Resolve Dialog -->
    <p-dialog
      [visible]="showBulkResolve"
      (visibleChange)="showBulkResolveChange.emit($event)"
      [header]="i18n.translate('Bulk Resolve Conflicts')"
      [modal]="true"
      [style]="{width:'500px'}"
      [dismissableMask]="true">
      <div class="resolve-form">
        <p>{{ i18n.translate('Resolving') }} {{ bulkCount }} {{ i18n.translate('conflicts') }}.</p>
        <div class="field">
          <label>{{ i18n.translate('Resolution Status') }}</label>
          <p-dropdown [(ngModel)]="bulkResolveForm.status" [options]="resolveStatusOptions" [placeholder]="i18n.translate('Select status')" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('Resolved By') }}</label>
          <input pInputText [(ngModel)]="bulkResolveForm.resolvedBy" [placeholder]="i18n.translate('User ID or email')" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('Resolution Note') }}</label>
          <textarea pInputTextarea [(ngModel)]="bulkResolveForm.resolutionNote" [rows]="4" [placeholder]="i18n.translate('Optional resolution notes...')"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('Cancel')" icon="pi pi-times" styleClass="p-button-text" (onClick)="showBulkResolveChange.emit(false)" />
        <p-button [label]="i18n.translate('Bulk Resolve')" icon="pi pi-check" (onClick)="confirmBulkResolve.emit(bulkResolveForm)" [loading]="resolving" />
      </ng-template>
    </p-dialog>

    <!-- Remediation Suggestions Dialog -->
    <p-dialog
      [visible]="showSuggestions"
      (visibleChange)="showSuggestionsChange.emit($event)"
      [header]="i18n.translate('Remediation Suggestions')"
      [modal]="true"
      [style]="{width:'600px'}"
      [dismissableMask]="true">
      <div class="suggestions-content" *ngIf="suggestions.length > 0">
        <p-accordion>
          <p-accordionTab *ngFor="let suggestion of suggestions" [header]="suggestion.action">
            <div class="suggestion-details">
              <p><strong>{{ i18n.translate('Description') }}:</strong> {{ suggestion.description }}</p>
              <p><strong>{{ i18n.translate('Confidence') }}:</strong> {{ (suggestion.confidence * 100) | number:'1.0-0' }}%</p>
              <p><strong>{{ i18n.translate('Impact') }}:</strong> {{ suggestion.impact }}</p>
            </div>
          </p-accordionTab>
        </p-accordion>
      </div>
      <div class="empty-state" *ngIf="suggestions.length === 0">
        <p>{{ i18n.translate('No remediation suggestions available') }}</p>
      </div>
    </p-dialog>

    <!-- Resolution History Dialog -->
    <p-dialog
      [visible]="showHistory"
      (visibleChange)="showHistoryChange.emit($event)"
      [header]="i18n.translate('Resolution History')"
      [modal]="true"
      [style]="{width:'700px'}"
      [dismissableMask]="true">
      <div class="history-content" *ngIf="history.length > 0">
        <p-timeline [value]="history" styleClass="custom-timeline">
          <ng-template pTemplate="marker" let-item>
            <span class="custom-marker" [ngClass]="'marker-' + item.action">
              <i [class]="getHistoryIcon(item.action)"></i>
            </span>
          </ng-template>
          <ng-template pTemplate="content" let-item>
            <p-card>
              <div class="history-item">
                <div class="history-header">
                  <strong>{{ item.action }}</strong>
                  <span class="history-date">{{ item.performedAt | date:'short' }}</span>
                </div>
                <div class="history-body">
                  <p><strong>{{ i18n.translate('Performed By') }}:</strong> {{ item.performedBy }}</p>
                  <p *ngIf="item.note"><strong>{{ i18n.translate('Note') }}:</strong> {{ item.note }}</p>
                  <pre *ngIf="item.metadata" class="history-metadata">{{ item.metadata | json }}</pre>
                </div>
              </div>
            </p-card>
          </ng-template>
        </p-timeline>
      </div>
      <div class="empty-state" *ngIf="history.length === 0">
        <p>{{ i18n.translate('No resolution history available') }}</p>
      </div>
    </p-dialog>
  `,
    styles: [`
    .details-content { display: flex; flex-direction: column; gap: 12px; }
    .detail-row { display: flex; align-items: flex-start; gap: 8px; }
    .detail-row strong { min-width: 120px; }
    .factors-json { font-size: var(--font-size-xs); background: var(--surface-100); padding: 8px; border-radius: var(--radius-sm); overflow-x: auto; }
    .resolve-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .suggestions-content { display: flex; flex-direction: column; gap: 8px; }
    .suggestion-details { display: flex; flex-direction: column; gap: 8px; }
    .history-content { max-height: 500px; overflow-y: auto; }
    .history-item { display: flex; flex-direction: column; gap: 8px; }
    .history-header { display: flex; justify-content: space-between; align-items: center; }
    .history-date { font-size: var(--font-size-xs); color: var(--text-muted); }
    .history-body { display: flex; flex-direction: column; gap: 4px; }
    .history-metadata { font-size: var(--font-size-xs); background: var(--surface-100); padding: 8px; border-radius: var(--radius-sm); overflow-x: auto; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); }
  `]
})
export class SodResolutionDialogComponent {
  readonly i18n = inject(I18nService);

  /* Details dialog */
  @Input() showDetails = false;
  @Output() showDetailsChange = new EventEmitter<boolean>();
  @Input() selectedConflict: SodConflictDetail | null = null;

  /* Single resolve dialog */
  @Input() showResolve = false;
  @Output() showResolveChange = new EventEmitter<boolean>();
  @Input() resolveForm: SodResolveFormModel = { status: 'resolved', resolvedBy: '', resolutionNote: '' };
  @Output() confirmResolve = new EventEmitter<SodResolveFormModel>();

  /* Bulk resolve dialog */
  @Input() showBulkResolve = false;
  @Output() showBulkResolveChange = new EventEmitter<boolean>();
  @Input() bulkResolveForm: SodResolveFormModel = { status: 'resolved', resolvedBy: '', resolutionNote: '' };
  @Input() bulkCount = 0;
  @Output() confirmBulkResolve = new EventEmitter<SodResolveFormModel>();

  /* Shared */
  @Input() resolving = false;
  @Input() resolveStatusOptions: { label: string; value: string }[] = [];

  /* Suggestions dialog */
  @Input() showSuggestions = false;
  @Output() showSuggestionsChange = new EventEmitter<boolean>();
  @Input() suggestions: GrcRecord[] = [];

  /* History dialog */
  @Input() showHistory = false;
  @Output() showHistoryChange = new EventEmitter<boolean>();
  @Input() history: GrcRecord[] = [];

  /** Map history action to PrimeNG icon class */
  getHistoryIcon(action: string): string {
    switch (action) {
      case 'resolved': return 'pi pi-check-circle';
      case 'mitigated': return 'pi pi-shield';
      case 'accepted': return 'pi pi-check';
      case 'reopened': return 'pi pi-refresh';
      case 'escalated': return 'pi pi-arrow-up';
      default: return 'pi pi-circle';
    }
  }
}
