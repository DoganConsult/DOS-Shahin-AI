/**
 * SamaAssessmentTableComponent — Dumb presentational component
 * Renders the SAMA CSF assessment controls within a subdomain,
 * with status pills, notes, and evidence tags.
 * Parent: SAMAAssessmentComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { InputModule, ProgressIndicatorModule, TagModule, TooltipModule } from 'carbon-components-angular';

/** Shared interfaces for SAMA assessment domain structures */
export interface SAMAControl {
  id: string; code: string; titleEn: string; titleAr: string;
  descEn: string; descAr: string; priority: string; automatable: boolean;
  evidenceTypes: string[]; mappedTo: string[];
}

export interface SAMASubdomain {
  id: string; code: string; nameEn: string; nameAr: string;
  controls: SAMAControl[];
}

export interface SAMADomain {
  id: string; code: string; nameEn: string; nameAr: string;
  subdomains: SAMASubdomain[];
}

export type ControlStatus = 'implemented' | 'partially' | 'not_implemented' | 'not_applicable';

export interface StatusOption {
  value: ControlStatus;
  label: string;
  labelAr: string;
  icon: string;
}

@Component({
  selector: 'app-sama-assessment-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, StatusBadgeComponent,
    ProgressIndicatorModule, InputModule, TagModule, TooltipModule,
  ],
  template: `
    <!-- Subdomain sections for a single domain -->
    <div *ngFor="let sd of domain.subdomains" class="subdomain-section">
      <div tabindex="0" role="button"
           (keyup.enter)="subdomainToggle.emit(domain.id + '-' + sd.id)"
           class="subdomain-header"
           (click)="subdomainToggle.emit(domain.id + '-' + sd.id)">
        <div class="subdomain-title">
          <i class="pi" [ngClass]="expandedSubdomains[domain.id + '-' + sd.id] ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
          <span class="sd-code">{{ sd.code }}</span>
          {{ i18n.localize(sd.nameEn, sd.nameAr) }}
        </div>
        <div class="sd-progress">
          <span class="sd-count">{{ getSubdomainAssessed(sd) }}/{{ sd.controls.length }}</span>
          <cds-progress-bar [value]="getSubdomainProgress(sd)" [showValue]="false" styleClass="sd-bar" />
        </div>
      </div>

      <div *ngIf="expandedSubdomains[domain.id + '-' + sd.id]" class="controls-list">
        <div *ngFor="let ctrl of sd.controls" class="control-card"
             [class.assessed]="getItemStatus(ctrl.id) !== 'not_implemented'">
          <div class="ctrl-top">
            <span class="ctrl-code">{{ ctrl.code }}</span>
            <span class="ctrl-priority" [class]="'priority-' + ctrl.priority">{{ ctrl.priority }}</span>
            <span *ngIf="ctrl.automatable" class="ctrl-auto" [cdsTooltip]="Automatable"><i class=""></i></span>
          </div>
          <div class="ctrl-title">{{ i18n.localize(ctrl.titleEn, ctrl.titleAr) }}</div>
          <div class="ctrl-desc">{{ i18n.localize(ctrl.descEn, ctrl.descAr) }}</div>

          <div class="status-pills">
            <button *ngFor="let opt of statusOptions" class="pill"
                    [class.active]="getItemStatus(ctrl.id) === opt.value"
                    [class]="'pill-' + opt.value"
                    (click)="statusChange.emit({ controlId: ctrl.id, status: opt.value })">
              <i class="pi" [ngClass]="opt.icon"></i>
              {{ i18n.localize(opt.label, opt.labelAr) }}
            </button>
          </div>

          <div class="ctrl-notes" *ngIf="getItemStatus(ctrl.id) !== 'not_implemented'">
            <textarea pInputTextarea [rows]="1"
                      [placeholder]="i18n.translate('samaAssessment.notesPlaceholder') !== 'samaAssessment.notesPlaceholder' ? i18n.translate('samaAssessment.notesPlaceholder') : i18n.translate('ncaAssessment.notesPlaceholder')"
                      [attr.aria-label]="i18n.translate('samaAssessment.notesPlaceholder') !== 'samaAssessment.notesPlaceholder' ? i18n.translate('samaAssessment.notesPlaceholder') : i18n.translate('ncaAssessment.notesPlaceholder')"
                      [ngModel]="getItemNotes(ctrl.id)"
                      (ngModelChange)="notesChange.emit({ controlId: ctrl.id, notes: $event })"></textarea>
          </div>

          <div class="ctrl-evidence" *ngIf="ctrl.evidenceTypes.length > 0">
            <span class="evidence-label"><i class=""></i>
              {{ i18n.translate('samaAssessment.evidenceNeeded') !== 'samaAssessment.evidenceNeeded' ? i18n.translate('samaAssessment.evidenceNeeded') : i18n.translate('ncaAssessment.evidenceNeeded') }}:</span>
            <cds-tag *ngFor="let et of ctrl.evidenceTypes" [value]="et" severity="info" styleClass="ev-tag" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .subdomain-section { margin-bottom: 4px; }
    .subdomain-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; background: var(--surface-ice); border: 1px solid var(--border, var(--border-subtle));
      border-radius: var(--radius); cursor: pointer; transition: background 200ms;
    }
    .subdomain-header:hover { background: var(--status-info-bg, #edf5ff); }
    .subdomain-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: var(--font-size-base); }
    .sd-code { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); font-weight: 700; }
    .sd-progress { display: flex; align-items: center; gap: 8px; min-width: 150px; }
    .sd-count { font-size: var(--font-size-sm); color: var(--text-muted); white-space: nowrap; }

    .controls-list { padding: 8px 0 8px 16px; }
    .control-card {
      padding: 16px; margin-bottom: 8px; background: #fff; border: 1px solid var(--border, var(--border-subtle));
      border-radius: var(--radius-md); transition: all 200ms;
    }
    .control-card.assessed { border-color: #bae6fd; background: var(--status-info-bg, #edf5ff); }
    .ctrl-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .ctrl-code { font-weight: 700; font-size: var(--font-size-sm); color: var(--primary, #1e40af); }
    .ctrl-priority { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: var(--radius-pill); }
    .priority-critical { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .priority-high { background: #fed7aa; color: #9a3412; }
    .priority-medium { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .priority-low { background: #d1fae5; color: #065f46; }
    .ctrl-auto { color: var(--warning); }
    .ctrl-title { font-weight: 600; font-size: var(--font-size-base); margin-bottom: 4px; }
    .ctrl-desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin-bottom: 10px; line-height: 1.5; }

    .status-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .pill {
      padding: 6px 14px; border-radius: var(--radius-pill); border: 1.5px solid var(--border, var(--border-subtle));
      background: #fff; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 4px; transition: all 200ms;
    }
    .pill:hover { border-color: var(--text-muted); }
    .pill.active.pill-implemented { background: #dcfce7; border-color: var(--success); color: var(--success); }
    .pill.active.pill-partially { background: var(--status-warning-bg, #fcf4d6); border-color: var(--warning); color: var(--warning); }
    .pill.active.pill-not_implemented { background: var(--status-danger-bg, #fff1f1); border-color: var(--error); color: var(--error); }
    .pill.active.pill-not_applicable { background: var(--surface-ice); border-color: var(--text-muted); color: var(--text-muted); }

    .ctrl-notes { margin-top: 8px; }
    .ctrl-notes textarea { width: 100%; font-size: var(--font-size-sm); }
    .ctrl-evidence { margin-top: 6px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .evidence-label { font-size: var(--font-size-xs); color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
  `],
})
export class SamaAssessmentTableComponent {
  i18n = inject(I18nService);

  /** The domain whose subdomains/controls to render */
  @Input() domain!: SAMADomain;

  /** Map of controlId -> status */
  @Input() itemStatuses: Map<string, ControlStatus> = new Map();

  /** Map of controlId -> notes */
  @Input() itemNotes: Map<string, string> = new Map();

  /** Which subdomains are expanded */
  @Input() expandedSubdomains: Record<string, boolean> = {};

  /** Available status options for the pills */
  @Input() statusOptions: StatusOption[] = [];

  /** Emitted when a subdomain header is toggled */
  @Output() subdomainToggle = new EventEmitter<string>();

  /** Emitted when a control status changes */
  @Output() statusChange = new EventEmitter<{ controlId: string; status: ControlStatus }>();

  /** Emitted when control notes change */
  @Output() notesChange = new EventEmitter<{ controlId: string; notes: string }>();

  getItemStatus(controlId: string): ControlStatus {
    return this.itemStatuses.get(controlId) || 'not_implemented';
  }

  getItemNotes(controlId: string): string {
    return this.itemNotes.get(controlId) || '';
  }

  getSubdomainAssessed(sd: SAMASubdomain): number {
    return sd.controls.filter(c => this.getItemStatus(c.id) !== 'not_implemented').length;
  }

  getSubdomainProgress(sd: SAMASubdomain): number {
    if (sd.controls.length === 0) return 0;
    return Math.round((this.getSubdomainAssessed(sd) / sd.controls.length) * 100);
  }
}
