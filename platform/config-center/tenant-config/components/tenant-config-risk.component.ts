import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Presentational child component for the Risk Model, RACI Matrix,
 * and Cadence Overrides sections of the tenant configuration page.
 */
@Component({
    selector: 'app-tenant-config-risk',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TagModule, TableModule, TooltipModule],
    template: `
    <!-- Risk Model section -->
    @if (activeSection === 'risk') {
      <div class="sc-card">
        <div class="sc-section-header">
          <div class="sc-section-title-row">
            <h3 class="sc-card-title">{{ i18n.translate('tenantConfig.riskModel') }}</h3>
            <p-tag [value]="riskModel.formula ? (i18n.translate('tenantConfig.configured')) : (i18n.translate('tenantConfig.notConfigured'))"
              [severity]="riskModel.formula ? 'success' : 'warning'" />
          </div>
          <p class="sc-card-desc">{{ i18n.translate('tenantConfig.impactlikelihoodScalesAppetiteThresholdA') }}</p>
        </div>
        @if (riskModelLoading) {
          <div class="sc-loading"><i class="pi pi-spin pi-spinner" style="font-size:2rem"></i></div>
        } @else {
          <div class="sc-form-grid">
            <div class="sc-field">
              <label class="sc-label">{{ i18n.translate('tenantConfig.impactScale1n') }}</label>
              <input pInputText [(ngModel)]="riskModel.impact_scale" type="number" class="w-full" (input)="onRiskFieldChange()" />
              <div class="sc-scale-labels" *ngIf="riskModel.impact_scale > 0">
                @for (i of getScaleRange(riskModel.impact_scale); track i) {
                  <span class="sc-scale-tag">{{ i }} -- {{ getImpactLabel(i) }}</span>
                }
              </div>
            </div>
            <div class="sc-field">
              <label class="sc-label">{{ i18n.translate('tenantConfig.likelihoodScale1n') }}</label>
              <input pInputText [(ngModel)]="riskModel.likelihood_scale" type="number" class="w-full" (input)="onRiskFieldChange()" />
              <div class="sc-scale-labels" *ngIf="riskModel.likelihood_scale > 0">
                @for (i of getScaleRange(riskModel.likelihood_scale); track i) {
                  <span class="sc-scale-tag">{{ i }} -- {{ getLikelihoodLabel(i) }}</span>
                }
              </div>
            </div>
            <div class="sc-field">
              <label class="sc-label">{{ i18n.translate('tenantConfig.riskAppetiteThreshold') }}</label>
              <input pInputText [(ngModel)]="riskModel.appetite_threshold" type="number" class="w-full" (input)="onRiskFieldChange()" />
            </div>
            <div class="sc-field">
              <label class="sc-label">{{ i18n.translate('tenantConfig.scoringFormula') }}</label>
              <input pInputText [(ngModel)]="riskModel.formula" placeholder="impact * likelihood" aria-label="impact * likelihood" class="w-full" (input)="markDirty.emit('risk')" />
            </div>
          </div>

          <div class="sc-heatmap-section">
            <h4 class="sc-sub-title"><i class="pi pi-th-large"></i> {{ i18n.translate('tenantConfig.heatmapPreview') }}</h4>
            <div class="sc-heatmap-grid" [style.grid-template-columns]="'40px repeat(' + (riskModel.impact_scale || 5) + ', 1fr)'">
              <div class="sc-hm-corner"></div>
              @for (col of getScaleRange(riskModel.impact_scale || 5); track col) {
                <div class="sc-hm-col-header">I{{ col }}</div>
              }
              @for (row of getScaleRangeReverse(riskModel.likelihood_scale || 5); track row) {
                <div class="sc-hm-row-header">L{{ row }}</div>
                @for (col of getScaleRange(riskModel.impact_scale || 5); track col) {
                  <div class="sc-hm-cell" [style.background]="getHeatmapColor(col, row)"
                    [pTooltip]="'Score: ' + (col * row)">
                    {{ col * row }}
                  </div>
                }
              }
            </div>
            <div class="sc-hm-legend">
              <span class="sc-hm-legend-item"><span class="sc-hm-dot" style="background:var(--success)"></span> {{ i18n.translate('tenantConfig.low') }}</span>
              <span class="sc-hm-legend-item"><span class="sc-hm-dot" style="background:var(--warning)"></span> {{ i18n.translate('tenantConfig.medium') }}</span>
              <span class="sc-hm-legend-item"><span class="sc-hm-dot" style="background:var(--error)"></span> {{ i18n.translate('tenantConfig.highThreshold') }}</span>
            </div>
          </div>

          <div class="sc-example-section">
            <h4 class="sc-sub-title"><i class="pi pi-calculator"></i> {{ i18n.translate('tenantConfig.exampleRiskPreview') }}</h4>
            <div class="sc-form-grid">
              <div class="sc-field">
                <label class="sc-label">{{ i18n.translate('tenantConfig.exampleImpact') }}</label>
                <input pInputText [(ngModel)]="exampleRisk.impact" type="number" class="w-full" (input)="calcExampleRisk()" />
              </div>
              <div class="sc-field">
                <label class="sc-label">{{ i18n.translate('tenantConfig.exampleLikelihood') }}</label>
                <input pInputText [(ngModel)]="exampleRisk.likelihood" type="number" class="w-full" (input)="calcExampleRisk()" />
              </div>
            </div>
            <div class="sc-example-result">
              <span class="sc-example-score">{{ i18n.translate('tenantConfig.score') }} <strong>{{ exampleRisk.score }}</strong></span>
              <p-tag [value]="exampleRisk.score >= (riskModel.appetite_threshold || 12) ? (i18n.translate('tenantConfig.aboveAppetite')) : (i18n.translate('tenantConfig.withinAppetite'))"
                [severity]="exampleRisk.score >= (riskModel.appetite_threshold || 12) ? 'danger' : 'success'" />
            </div>
          </div>

          <div class="sc-save-bar">
            @if (dirtyFlags['risk']) {
              <span class="sc-unsaved"><i class="pi pi-exclamation-circle"></i> {{ i18n.translate('tenantConfig.unsavedChanges') }}</span>
            }
            <span class="sc-save-spacer"></span>
            <a class="sc-audit-link" (click)="navigateToAudit.emit('risk_model')">
              <i class="pi pi-history"></i> {{ i18n.translate('tenantConfig.audit') }}
            </a>
            <p-button [label]="i18n.translate('tenantConfig.saveRiskModel')" icon="pi pi-save" (onClick)="saveRiskModel.emit()" [disabled]="!dirtyFlags['risk']" />
          </div>
        }
      </div>
    }

    <!-- RACI Matrix section -->
    @if (activeSection === 'raci') {
      <div class="sc-card">
        <div class="sc-section-header">
          <div class="sc-section-title-row">
            <h3 class="sc-card-title">{{ i18n.translate('tenantConfig.raciMatrix') }}</h3>
            <p-tag [value]="raciMatrix.length + ' ' + (i18n.translate('tenantConfig.domains'))" severity="info" />
          </div>
          <p class="sc-card-desc">{{ i18n.translate('tenantConfig.responsibilitiesByDomain') }}</p>
        </div>
        @if (raciLoading) {
          <div class="sc-loading"><i class="pi pi-spin pi-spinner" style="font-size:2rem"></i></div>
        } @else {
          <p-table aria-label="Raci Matrix table" [value]="raciMatrix" styleClass="p-datatable-sm p-datatable-striped" [paginator]="raciMatrix.length > 10" [rows]="10">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('tenantConfig.domain') }}</th>
                <th>{{ i18n.translate('tenantConfig.responsible') }}</th>
                <th>{{ i18n.translate('tenantConfig.accountable') }}</th>
                <th>{{ i18n.translate('tenantConfig.consulted') }}</th>
                <th>{{ i18n.translate('tenantConfig.informed') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.domain }}</td>
                <td><input pInputText [(ngModel)]="row.responsible" class="w-full" (input)="markDirty.emit('raci')" /></td>
                <td><input pInputText [(ngModel)]="row.accountable" class="w-full" (input)="markDirty.emit('raci')" /></td>
                <td><input pInputText [(ngModel)]="row.consulted" class="w-full" (input)="markDirty.emit('raci')" /></td>
                <td><input pInputText [(ngModel)]="row.informed" class="w-full" (input)="markDirty.emit('raci')" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">{{ i18n.translate('tenantConfig.noRaciDataConfigured') }}</td></tr>
            </ng-template>
          </p-table>
          <div class="sc-save-bar">
            @if (dirtyFlags['raci']) {
              <span class="sc-unsaved"><i class="pi pi-exclamation-circle"></i> {{ i18n.translate('tenantConfig.unsavedChanges') }}</span>
            }
            <span class="sc-save-spacer"></span>
            <p-button [label]="i18n.translate('tenantConfig.saveRaci')" icon="pi pi-save" (onClick)="saveRaci.emit()" [disabled]="!dirtyFlags['raci']" />
          </div>
        }
      </div>
    }

    <!-- Cadence Overrides section -->
    @if (activeSection === 'cadence') {
      <div class="sc-card">
        <div class="sc-section-header">
          <div class="sc-section-title-row">
            <h3 class="sc-card-title">{{ i18n.translate('tenantConfig.cadenceOverrides') }}</h3>
            <p-tag [value]="cadenceOverrides.length + ' ' + (i18n.translate('tenantConfig.overrides'))" severity="info" />
          </div>
          <p class="sc-card-desc">{{ i18n.translate('tenantConfig.overrideDefaultFrequenciesByDomainAffect') }}</p>
        </div>
        @if (cadenceLoading) {
          <div class="sc-loading"><i class="pi pi-spin pi-spinner" style="font-size:2rem"></i></div>
        } @else {
          <div class="sc-cadence-toolbar">
            <p-button [label]="i18n.translate('tenantConfig.addOverride')" icon="pi pi-plus" severity="secondary" (onClick)="addCadenceOverride.emit()" />
          </div>
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Cadence Overrides table" [value]="cadenceOverrides" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('tenantConfig.domain') }}</th>
                <th>{{ i18n.translate('tenantConfig.defaultFrequency') }}</th>
                <th>{{ i18n.translate('tenantConfig.overrideFrequency') }}</th>
                <th>{{ i18n.translate('tenantConfig.effectiveFrom') }}</th>
                <th>{{ i18n.translate('tenantConfig.next3RunDates') }}</th>
                <th style="width:60px"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row let-i="rowIndex">
              <tr>
                <td>{{ row.domain }}</td>
                <td><p-tag [value]="row.default_frequency" /></td>
                <td><input pInputText [(ngModel)]="row.override_frequency" [placeholder]="row.default_frequency" [attr.aria-label]="row.default_frequency" class="w-full" (input)="markDirty.emit('cadence')" /></td>
                <td>
                  <input pInputText [(ngModel)]="row.effective_from" type="date" class="w-full" (input)="markDirty.emit('cadence')" />
                </td>
                <td class="ts-cell">
                  <div class="sc-next-runs">
                    @for (d of getNextRunDates(row); track d) {
                      <span class="sc-run-date">{{ d }}</span>
                    }
                  </div>
                </td>
                <td>
                  <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="removeCadenceOverride.emit(i)" pTooltip="Remove" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">
                <div class="sc-empty-inline">
                  <i class="pi pi-calendar" style="font-size: var(--font-size-2xl);color:#94a3b8"></i>
                  <span>{{ i18n.translate('tenantConfig.noOverridesUsingDefaultFrequencies') }}</span>
                </div>
              </td></tr>
            </ng-template>
          </p-table>
          <div class="sc-save-bar">
            @if (dirtyFlags['cadence']) {
              <span class="sc-unsaved"><i class="pi pi-exclamation-circle"></i> {{ i18n.translate('tenantConfig.unsavedChanges') }}</span>
            }
            <span class="sc-save-spacer"></span>
            <a class="sc-audit-link" (click)="navigateToAudit.emit('cadence_override')">
              <i class="pi pi-history"></i> {{ i18n.translate('tenantConfig.audit') }}
            </a>
            <p-button [label]="i18n.translate('tenantConfig.saveOverrides')" icon="pi pi-save" (onClick)="saveCadenceOverrides.emit()" [disabled]="!dirtyFlags['cadence']" />
          </div>
        }
      </div>
    }
  `,
    styles: [`
    .sc-card{background:var(--surface-card,#fff);border:1px solid var(--surface-border,var(--border-subtle));border-radius:var(--radius-lg);padding:24px;display:flex;flex-direction:column;gap:16px}
    .sc-section-header{display:flex;flex-direction:column;gap:4px;margin-bottom:4px}
    .sc-section-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .sc-card-title{margin:0;font-size:17px;font-weight:700;color:var(--text-heading,#111)}
    .sc-card-desc{margin:0;font-size:var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
    .sc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}
    .sc-field{display:flex;flex-direction:column;gap:5px}
    .sc-label{font-size:var(--font-size-sm);font-weight:600;color:var(--text-muted,var(--text-muted));letter-spacing:.2px}
    .sc-save-bar{display:flex;align-items:center;gap:8px;padding-top:12px;border-top:1px solid var(--surface-border,var(--border-subtle));margin-top:4px;flex-wrap:wrap}
    .sc-save-spacer{flex:1}
    .sc-unsaved{display:flex;align-items:center;gap:6px;font-size:var(--font-size-sm);color:var(--warning);font-weight:600}
    .sc-unsaved .pi{font-size:var(--font-size-sm)}
    .sc-audit-link{display:inline-flex;align-items:center;gap:5px;font-size:var(--font-size-sm);color:var(--primary-600,#2563eb);cursor:pointer;font-weight:500;text-decoration:none;padding:6px 10px;border-radius:var(--radius-sm);transition:background .15s}
    .sc-audit-link:hover{background:var(--primary-50,#eff6ff);text-decoration:underline}
    .sc-loading{text-align:center;padding:32px;color:var(--text-muted)}
    .sc-sub-title{margin:0 0 10px;font-size:var(--font-size-base);font-weight:700;color:var(--text-heading);display:flex;align-items:center;gap:8px}
    .sc-sub-title .pi{color:var(--primary-600,#2563eb)}
    .sc-scale-labels{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
    .sc-scale-tag{font-size:var(--font-size-xs);padding:2px 8px;border-radius:var(--radius-xs);background:var(--surface-ice);color:var(--text-muted)}
    .sc-heatmap-section{padding:16px;background:var(--surface-ground);border-radius:var(--radius-md);border:1px solid var(--surface-border)}
    .sc-heatmap-grid{display:grid;gap:2px;max-width:500px}
    .sc-hm-corner{background:transparent}
    .sc-hm-col-header,.sc-hm-row-header{font-size:var(--font-size-xs);font-weight:700;text-align:center;padding:4px;color:var(--text-muted)}
    .sc-hm-cell{text-align:center;padding:8px 4px;border-radius:var(--radius-xs);font-size:var(--font-size-xs);font-weight:700;color:#fff;cursor:default;min-width:36px}
    .sc-hm-legend{display:flex;gap:16px;margin-top:10px}
    .sc-hm-legend-item{display:flex;align-items:center;gap:6px;font-size:var(--font-size-sm);color:var(--text-muted)}
    .sc-hm-dot{width:12px;height:12px;border-radius:var(--radius-xs);display:inline-block}
    .sc-example-section{padding:16px;background:var(--surface-ground);border-radius:var(--radius-md);border:1px solid var(--surface-border)}
    .sc-example-result{display:flex;align-items:center;gap:12px;margin-top:10px;padding:10px 14px;background:var(--surface-card);border-radius:var(--radius);border:1px solid var(--surface-border)}
    .sc-example-score{font-size:var(--font-size-base);color:var(--text-heading)}
    .sc-cadence-toolbar{display:flex;gap:8px;margin-bottom:4px}
    .sc-next-runs{display:flex;flex-direction:column;gap:2px}
    .sc-run-date{font-size:var(--font-size-xs);color:var(--text-muted)}
    .sc-empty-inline{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;color:var(--text-muted);font-size:var(--font-size-sm)}
    .ts-cell{font-size:var(--font-size-sm);white-space:nowrap;color:var(--text-muted)}
    .w-full{width:100%}
    @media(max-width:768px){.sc-form-grid{grid-template-columns:1fr}.sc-heatmap-grid{max-width:100%}}
  `]
})
export class TenantConfigRiskComponent {
  /** Which section tab is currently active */
  @Input() activeSection = '';
  /** Risk model configuration */
  @Input() riskModel: GrcRecord = {};
  /** Whether risk model is loading */
  @Input() riskModelLoading = false;
  /** RACI matrix data */
  @Input() raciMatrix: GrcRecord[] = [];
  /** Whether RACI data is loading */
  @Input() raciLoading = false;
  /** Cadence override data */
  @Input() cadenceOverrides: GrcRecord[] = [];
  /** Whether cadence data is loading */
  @Input() cadenceLoading = false;
  /** Example risk calculator state */
  @Input() exampleRisk = { impact: 3, likelihood: 4, score: 12 };
  /** Dirty flags record from parent */
  @Input() dirtyFlags: Record<string, boolean> = {};

  @Output() markDirty = new EventEmitter<string>();
  @Output() saveRiskModel = new EventEmitter<void>();
  @Output() saveRaci = new EventEmitter<void>();
  @Output() saveCadenceOverrides = new EventEmitter<void>();
  @Output() addCadenceOverride = new EventEmitter<void>();
  @Output() removeCadenceOverride = new EventEmitter<number>();
  @Output() navigateToAudit = new EventEmitter<string>();

  constructor(public i18n: I18nService) {}

  /** Generate array [1..n] for scale rendering, capped at 10 */
  getScaleRange(n: number): number[] {
    return Array.from({ length: Math.min(n || 5, 10) }, (_, i) => i + 1);
  }

  /** Generate reversed array [n..1] for heatmap rows */
  getScaleRangeReverse(n: number): number[] {
    return this.getScaleRange(n).reverse();
  }

  /** Human-readable label for impact level */
  getImpactLabel(level: number): string {
    const labels: Record<number, string> = { 1: 'Negligible', 2: 'Minor', 3: 'Moderate', 4: 'Major', 5: 'Critical' };
    return labels[level] || `Level ${level}`;
  }

  /** Human-readable label for likelihood level */
  getLikelihoodLabel(level: number): string {
    const labels: Record<number, string> = { 1: 'Rare', 2: 'Unlikely', 3: 'Possible', 4: 'Likely', 5: 'Almost Certain' };
    return labels[level] || `Level ${level}`;
  }

  /** Compute heatmap cell color based on score vs threshold */
  getHeatmapColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    const threshold = this.riskModel.appetite_threshold || 12;
    if (score >= threshold) return '#ef4444';
    if (score >= threshold * 0.5) return '#f59e0b';
    return '#22c55e';
  }

  /** Recalculate the example risk score */
  calcExampleRisk(): void {
    this.exampleRisk.score = (this.exampleRisk.impact || 0) * (this.exampleRisk.likelihood || 0);
  }

  /** Handle risk field change: mark dirty and recalculate */
  onRiskFieldChange(): void {
    this.markDirty.emit('risk');
    this.calcExampleRisk();
  }

  /** Compute next 3 run dates for a cadence override row */
  getNextRunDates(row: GrcRecord): string[] {
    const freq = row.override_frequency || row.default_frequency || 'monthly';
    const start = row.effective_from ? new Date(row.effective_from) : new Date();
    const dates: string[] = [];
    const daysMap: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90, annually: 365 };
    const interval = daysMap[freq.toLowerCase()] || 30;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(start.getTime() + interval * i * 86400000);
      dates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    }
    return dates;
  }
}
