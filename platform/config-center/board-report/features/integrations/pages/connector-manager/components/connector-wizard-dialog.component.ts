/**
 * ConnectorWizardDialogComponent — Dumb presentational component
 * Multi-step wizard dialog for creating a new connector:
 * Step 1: Select type, Step 2: Platform and credentials, Step 3: Schedule and create.
 * Parent: ConnectorManagerComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { StepsModule } from 'primeng/steps';
import { PasswordModule } from 'primeng/password';

/** Credential field definition for a connector platform */
export interface CredentialField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'password' | 'url';
  placeholder?: string;
}

/** Platform definition within a connector type */
export interface PlatformDef {
  value: string;
  label: string;
  fields: CredentialField[];
  authMethod: string;
}

/** Connector type definition */
export interface ConnectorTypeDef {
  key: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  platforms: PlatformDef[];
  defaultSchedule: string;
}

@Component({
  selector: 'app-connector-wizard-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule,
    InputTextModule, DropdownModule, StepsModule, PasswordModule,
  ],
  template: `
    <p-dialog [header]="wizardTitle" [(visible)]="visible" [modal]="true" [style]="{width:'680px'}" [closable]="true" (onHide)="closed.emit()">
      <p-steps [model]="wizardSteps" [activeIndex]="wizardStep" [readonly]="true" styleClass="mb-4" />

      <!-- Step 1: Select Connector Type -->
      <div *ngIf="wizardStep === 0" class="type-grid">
        @for (ct of connectorTypes; track ct.key) {
          <div class="type-card" [class.selected]="selectedType?.key === ct.key" (click)="selectType(ct)">
            <div class="type-icon" [style.background]="ct.color + '18'" [style.color]="ct.color">
              <i class="pi" [ngClass]="ct.icon"></i>
            </div>
            <div class="type-info">
              <div class="type-label">{{ ct.label }}</div>
              <div class="type-desc">{{ ct.description }}</div>
            </div>
          </div>
        }
      </div>

      <!-- Step 2: Platform & Credentials -->
      <div *ngIf="wizardStep === 1 && selectedType">
        <div class="field mb-3">
          <label>Connector Name</label>
          <input pInputText [(ngModel)]="wizardName" class="w-full" [placeholder]="selectedType.label + ' Connector'" />
        </div>
        <div class="field mb-3" *ngIf="selectedType.platforms.length > 1">
          <label>Platform</label>
          <p-dropdown [options]="platformOptions" [(ngModel)]="selectedPlatformValue" (onChange)="onPlatformChange()" placeholder="Select platform" appendTo="body" class="w-full" />
        </div>
        <div *ngIf="selectedPlatform">
          @for (f of selectedPlatform.fields; track f.key) {
            <div class="field mb-3">
              <label>{{ f.label }} <span *ngIf="f.required" class="required">*</span></label>
              <input *ngIf="f.type !== 'password'" pInputText [(ngModel)]="credentials[f.key]" class="w-full" [placeholder]="f.placeholder || ''" />
              <p-password *ngIf="f.type === 'password'" [(ngModel)]="credentials[f.key]" [toggleMask]="true" [feedback]="false" styleClass="w-full" inputStyleClass="w-full" />
            </div>
          }
          <div class="test-row">
            <p-button label="Test Connection" icon="pi pi-bolt" severity="info" [outlined]="true" (onClick)="testRequested.emit()" [loading]="testing" />
            <span *ngIf="testResult" class="test-result" [class.test-ok]="testResult.valid" [class.test-fail]="!testResult.valid">
              <i class="pi" [ngClass]="testResult.valid ? 'pi-check-circle' : 'pi-times-circle'"></i>
              {{ testResult.valid ? 'Connected (' + testResult.latencyMs + 'ms)' : testResult.error }}
            </span>
          </div>
        </div>
      </div>

      <!-- Step 3: Schedule & Create -->
      <div *ngIf="wizardStep === 2">
        <div class="field mb-3">
          <label>Sync Schedule</label>
          <p-dropdown [options]="schedulePresets" [(ngModel)]="selectedSchedule" appendTo="body" class="w-full" />
        </div>
        <div class="field mb-3" *ngIf="selectedSchedule === 'custom'">
          <label>Custom Cron Expression</label>
          <input pInputText [(ngModel)]="customCron" class="w-full" placeholder="0 */6 * * *" />
        </div>
        <div class="summary-card" *ngIf="selectedType && selectedPlatform">
          <h4>Summary</h4>
          <div class="summary-row"><span>Type:</span><strong>{{ selectedType.label }}</strong></div>
          <div class="summary-row"><span>Platform:</span><strong>{{ selectedPlatform.label }}</strong></div>
          <div class="summary-row"><span>Auth:</span><strong>{{ selectedPlatform.authMethod }}</strong></div>
          <div class="summary-row"><span>Schedule:</span><strong>{{ effectiveSchedule }}</strong></div>
          <div class="summary-row" *ngIf="testResult?.valid"><span>Connection:</span><strong class="text-success">Verified</strong></div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button *ngIf="wizardStep > 0" label="Back" icon="pi pi-arrow-left" severity="secondary" [text]="true" (onClick)="wizardStep = wizardStep - 1" />
        <p-button *ngIf="wizardStep < 2" label="Next" icon="pi pi-arrow-right" iconPos="right" (onClick)="nextStep()" [disabled]="!canAdvance()" />
        <p-button *ngIf="wizardStep === 2" label="Create Connector" icon="pi pi-check" (onClick)="createRequested.emit()" [loading]="creating" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .mb-3 { margin-bottom: 16px; }
    .mb-4 { margin-bottom: 20px; }
    .w-full { width: 100%; }
    .field { margin-bottom: 0; }
    .field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 4px; color: var(--text-muted); }
    .required { color: var(--error); }
    .type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .type-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius-lg); border: 2px solid var(--surface-border, var(--border-subtle)); cursor: pointer; transition: all .15s; }
    .type-card:hover { border-color: var(--primary-300, #93c5fd); background: var(--surface-50, var(--surface-ice)); }
    .type-card.selected { border-color: var(--primary-500, #3b82f6); background: var(--primary-50, #eff6ff); }
    .type-icon { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xl); flex-shrink: 0; }
    .type-info { flex: 1; min-width: 0; }
    .type-label { font-weight: 700; font-size: var(--font-size-base); }
    .type-desc { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px; }
    .test-row { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--surface-border, var(--border-subtle)); }
    .test-result { font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px; }
    .test-ok { color: var(--success, #16a34a); }
    .test-fail { color: var(--error, #dc2626); }
    .summary-card { padding: 16px; border-radius: var(--radius-lg); background: var(--surface-50, var(--surface-ice)); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .summary-card h4 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border, var(--border-subtle)); }
    .summary-row:last-child { border: none; }
    .text-success { color: var(--success, #16a34a); }
  `],
})
export class ConnectorWizardDialogComponent {
  i18n = inject(I18nService);

  @Input() visible = false;
  @Input() connectorTypes: ConnectorTypeDef[] = [];
  @Input() schedulePresets: { label: string; value: string }[] = [];
  @Input() testing = false;
  @Input() creating = false;
  @Input() testResult: { valid: boolean; latencyMs: number; error?: string } | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() testRequested = new EventEmitter<void>();
  @Output() createRequested = new EventEmitter<void>();

  wizardStep = 0;
  wizardSteps = [{ label: 'Type' }, { label: 'Credentials' }, { label: 'Schedule' }];
  selectedType: ConnectorTypeDef | null = null;
  selectedPlatformValue = '';
  selectedPlatform: PlatformDef | null = null;
  wizardName = '';
  credentials: Record<string, string> = {};
  selectedSchedule = '0 2 * * *';
  customCron = '';

  get wizardTitle(): string {
    if (this.wizardStep === 0) return 'Select Connector Type';
    if (this.wizardStep === 1) return `Configure ${this.selectedType?.label || 'Connector'}`;
    return 'Review & Create';
  }

  get platformOptions() {
    return (this.selectedType?.platforms || []).map(p => ({ label: p.label, value: p.value }));
  }

  get effectiveSchedule(): string {
    return this.selectedSchedule === 'custom' ? this.customCron : this.selectedSchedule;
  }

  selectType(ct: ConnectorTypeDef): void {
    this.selectedType = ct;
    this.selectedSchedule = ct.defaultSchedule;
    if (ct.platforms.length === 1) {
      this.selectedPlatformValue = ct.platforms[0].value;
      this.selectedPlatform = ct.platforms[0];
    } else {
      this.selectedPlatformValue = '';
      this.selectedPlatform = null;
    }
    this.credentials = {};
  }

  onPlatformChange(): void {
    this.selectedPlatform = this.selectedType?.platforms.find(p => p.value === this.selectedPlatformValue) || null;
    this.credentials = {};
  }

  canAdvance(): boolean {
    if (this.wizardStep === 0) return !!this.selectedType;
    if (this.wizardStep === 1) {
      if (!this.selectedPlatform) return false;
      return this.selectedPlatform.fields.filter(f => f.required).every(f => !!this.credentials[f.key]);
    }
    return true;
  }

  nextStep(): void {
    if (this.canAdvance()) this.wizardStep++;
  }

  /** Reset wizard state to initial values */
  reset(): void {
    this.wizardStep = 0;
    this.selectedType = null;
    this.selectedPlatform = null;
    this.selectedPlatformValue = '';
    this.wizardName = '';
    this.credentials = {};
    this.selectedSchedule = '0 2 * * *';
    this.customCron = '';
  }
}
