import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { SliderModule } from 'primeng/slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { GaugeChartComponent, ProgressRingChartComponent } from '@app/shared/widgets/d3-charts';
import { ApiClientService } from "@app/core/services/api-client.service";

interface AutonomousConfig {
  enabled: boolean;
  slaGraceMultiplier: number;
  aiCanExecuteActions: boolean;
  aiCanDraftApprovals: boolean;
  requireHumanReview: boolean;
  cronIntervalMinutes: number;
}

@Component({
  selector: 'app-autonomous-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, PageShellComponent, CardModule, InputSwitchModule,
    SliderModule, InputNumberModule, ButtonModule, TagModule, TooltipModule,
    GaugeChartComponent, ProgressRingChartComponent,
  ],
  template: `
    <app-page-shell icon="cog" [title]="i18n.translate('autonomousConfig.title')"
      [subtitle]="i18n.translate('autonomousConfig.subtitle')"
      [breadcrumbs]="['Dashboard', 'Autonomous Config']" [loading]="loading">

      <div headerActions>
        <p-button icon="pi pi-save" [label]="i18n.translate('autonomousConfig.save')" (onClick)="saveConfig()" [loading]="saving" />
      </div>

      <div class="config-layout">
        <div class="gauges-row">
          <div class="gauge-card">
            <app-gauge-chart [value]="config.slaGraceMultiplier * 10" [max]="100" [size]="130"
              [label]="i18n.translate('autonomousConfig.slaGrace')"
              [thresholds]="[{color:'#22c55e',upTo:30},{color:'#f59e0b',upTo:60},{color:'#ef4444',upTo:100}]" />
            <span class="gauge-value">{{ config.slaGraceMultiplier }}x</span>
          </div>
          <div class="gauge-card">
            <app-progress-ring-chart [value]="config.cronIntervalMinutes" [max]="60" [size]="100" [color]="'#6366f1'" />
            <span class="gauge-value">{{ config.cronIntervalMinutes }} min</span>
            <span class="gauge-label">{{ i18n.translate('autonomousConfig.scanInterval') }}</span>
          </div>
          <div class="gauge-card">
            <app-progress-ring-chart [value]="enabledCount" [max]="4" [size]="100" [color]="'#22c55e'" />
            <span class="gauge-value">{{ enabledCount }}/4</span>
            <span class="gauge-label">{{ i18n.translate('autonomousConfig.featuresOn') }}</span>
          </div>
        </div>

        <div class="config-grid">
          <p-card styleClass="config-card">
            <div class="config-item">
              <div class="config-label-row">
                <i class="pi pi-power-off config-icon" [class.active]="config.enabled"></i>
                <div>
                  <h4>{{ i18n.translate('autonomousConfig.enableAutonomous') }}</h4>
                  <p>{{ i18n.translate('autonomousConfig.enableAutonomousDesc') }}</p>
                </div>
              </div>
              <p-inputSwitch [(ngModel)]="config.enabled" />
            </div>
          </p-card>

          <p-card styleClass="config-card">
            <div class="config-item">
              <div class="config-label-row">
                <i class="pi pi-bolt config-icon" [class.active]="config.aiCanExecuteActions"></i>
                <div>
                  <h4>{{ i18n.translate('autonomousConfig.executeActions') }}</h4>
                  <p>{{ i18n.translate('autonomousConfig.executeActionsDesc') }}</p>
                </div>
              </div>
              <p-inputSwitch [(ngModel)]="config.aiCanExecuteActions" />
            </div>
          </p-card>

          <p-card styleClass="config-card">
            <div class="config-item">
              <div class="config-label-row">
                <i class="pi pi-file-edit config-icon" [class.active]="config.aiCanDraftApprovals"></i>
                <div>
                  <h4>{{ i18n.translate('autonomousConfig.draftApprovals') }}</h4>
                  <p>{{ i18n.translate('autonomousConfig.draftApprovalsDesc') }}</p>
                </div>
              </div>
              <p-inputSwitch [(ngModel)]="config.aiCanDraftApprovals" />
            </div>
          </p-card>

          <p-card styleClass="config-card">
            <div class="config-item">
              <div class="config-label-row">
                <i class="pi pi-eye config-icon" [class.active]="config.requireHumanReview"></i>
                <div>
                  <h4>{{ i18n.translate('autonomousConfig.requireHumanReview') }}</h4>
                  <p>{{ i18n.translate('autonomousConfig.requireHumanReviewDesc') }}</p>
                </div>
              </div>
              <p-inputSwitch [(ngModel)]="config.requireHumanReview" />
            </div>
          </p-card>

          <p-card styleClass="config-card span-2">
            <div class="config-item vertical">
              <div class="config-label-row">
                <i class="pi pi-clock config-icon active"></i>
                <div>
                  <h4>{{ i18n.translate('autonomousConfig.slaGraceMultiplier') }}</h4>
                  <p>{{ i18n.translate('autonomousConfig.slaGraceMultiplierDesc') }}</p>
                </div>
              </div>
              <div class="slider-row">
                <p-slider [(ngModel)]="config.slaGraceMultiplier" [min]="0.1" [max]="10" [step]="0.1" styleClass="w-full" />
                <p-tag [value]="config.slaGraceMultiplier + 'x'" severity="info" />
              </div>
            </div>
          </p-card>

          <p-card styleClass="config-card span-2">
            <div class="config-item vertical">
              <div class="config-label-row">
                <i class="pi pi-sync config-icon active"></i>
                <div>
                  <h4>{{ i18n.translate('autonomousConfig.cronScanInterval') }}</h4>
                  <p>{{ i18n.translate('autonomousConfig.cronScanIntervalDesc') }}</p>
                </div>
              </div>
              <div class="slider-row">
                <p-inputNumber [(ngModel)]="config.cronIntervalMinutes" [min]="1" [max]="1440" [showButtons]="true" suffix=" min" styleClass="w-full" />
              </div>
            </div>
          </p-card>
        </div>

        @if (saved) {
          <div class="save-toast">
            <i class="pi pi-check-circle"></i>
            {{ i18n.translate('autonomousConfig.savedSuccessfully') }}
          </div>
        }
      </div>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .config-layout { display: flex; flex-direction: column; gap: 24px; }

    .gauges-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .gauge-card { display: flex; flex-direction: column; align-items: center; gap: 8px; background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); }
    .gauge-value { font-size: var(--font-size-xl); font-weight: 800; color: var(--text-heading, var(--text-heading)); }
    .gauge-label { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); font-weight: 600; }

    .config-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .span-2 { grid-column: span 2; }

    .config-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .config-item.vertical { flex-direction: column; align-items: stretch; }
    .config-label-row { display: flex; align-items: flex-start; gap: 12px; }
    .config-icon { font-size: var(--font-size-xl); color: var(--text-muted, var(--text-muted)); margin-top: 2px; transition: color 0.2s; }
    .config-icon.active { color: var(--success); }
    .config-item h4 { margin: 0; font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .config-item p { margin: 2px 0 0; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }

    .slider-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }

    .save-toast { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--success); color: #fff; border-radius: var(--radius); font-weight: 600; font-size: var(--font-size-base); animation: fadeInUp 0.3s ease; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}

    @media (max-width: 768px) {
      .gauges-row { grid-template-columns: 1fr; }
      .config-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }
  `]
})
export class AutonomousConfigComponent implements OnInit {
  loading = false;
  saving = false;
  saved = false;
  error = '';
  config: AutonomousConfig = {
    enabled: false,
    slaGraceMultiplier: 1.5,
    aiCanExecuteActions: true,
    aiCanDraftApprovals: false,
    requireHumanReview: true,
    cronIntervalMinutes: 5,
  };

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.loadConfig(); }

  get enabledCount(): number {
    let c = 0;
    if (this.config.enabled) c++;
    if (this.config.aiCanExecuteActions) c++;
    if (this.config.aiCanDraftApprovals) c++;
    if (this.config.requireHumanReview) c++;
    return c;
  }

  loadConfig() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.apiclientSvc.get('/autonomous/workflows/autonomous/config').subscribe({
      next: (data: any) => {
        if (data) {
          this.config = {
            enabled: data.enabled ?? false,
            slaGraceMultiplier: data.slaGraceMultiplier ?? data.sla_grace_multiplier ?? 1.5,
            aiCanExecuteActions: data.aiCanExecuteActions ?? data.ai_can_execute_actions ?? true,
            aiCanDraftApprovals: data.aiCanDraftApprovals ?? data.ai_can_draft_approvals ?? false,
            requireHumanReview: data.requireHumanReview ?? data.require_human_review ?? true,
            cronIntervalMinutes: data.cronIntervalMinutes ?? data.cron_interval_minutes ?? 5,
          };
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  saveConfig() {
    this.saving = true;
    this.saved = false;
    this.cdr.markForCheck();
    this.apiclientSvc.put('/autonomous/workflows/autonomous/config', this.config).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.saved = false; this.cdr.markForCheck(); }, 3000);
      },
      error: () => { this.saving = false; this.cdr.markForCheck(); }
    });
  }
}
