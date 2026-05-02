/**
 * TenantSelectFormComponent — Multi-tenant picker for users with multiple memberships.
 *
 * @owner DAuth
 * @since 2026-04-02  Step 4 decomposition
 */
import { Component, inject, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/infrastructure';
import { GrcRecord } from '@app/core/models/shared.types';
import { DropdownModule } from 'primeng/select';

export interface TenantMembership {
  tenantId: string;
  role: string;
  isPrimary: boolean;
  orgName: string;
}

@Component({
    selector: 'app-tenant-select-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, DropdownModule],
    template: `
    <div class="mfa-icon-wrap">
      <i class="pi pi-building mfa-shield-icon"></i>
    </div>
    <h1 class="auth-title">{{ i18n.translate('auth.tenantSelectTitle') }}</h1>
    <p class="auth-subtitle">{{ i18n.translate('auth.tenantSelectSubtitle') }}</p>

    <div class="auth-field">
      <label><i class="pi pi-building"></i> {{ i18n.translate('auth.tenantSelectLabel') }}</label>
      <p-dropdown
        [options]="dropdownOptions"
        [(ngModel)]="selectedTenantId"
        optionLabel="label"
        optionValue="value"
        [style]="{'width':'100%'}"
        styleClass="auth-tenant-dropdown"
        appendTo="body">
      </p-dropdown>
    </div>

    <button class="auth-submit-btn" type="button" [disabled]="loading || !selectedTenantId" (click)="onSelectTenant()">
      <i class="pi pi-sign-in" *ngIf="!loading"></i>
      <i class="pi pi-spin pi-spinner" *ngIf="loading"></i>
      {{ loading ? i18n.translate('auth.signingIn') : i18n.translate('auth.tenantSelectContinue') }}
    </button>

    <div class="mfa-actions">
      <button class="auth-text-btn" (click)="backToLogin.emit()">
        <i class="pi pi-arrow-left"></i> {{ i18n.translate('auth.mfaBackToLogin') }}
      </button>
    </div>
  `,
    styles: [`
    .mfa-icon-wrap { text-align: center; margin-bottom: 1rem; }
    .mfa-shield-icon { font-size: var(--font-size-6xl); color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); border-radius: var(--radius-pill); padding: 20px; }
    .mfa-actions { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-top: 1.25rem; }
    .auth-text-btn {
      background: none; border: none; color: var(--primary); cursor: pointer;
      font-size: var(--font-size-base); display: inline-flex; align-items: center; gap: 0.4rem; padding: 0;
    }
    .auth-text-btn:hover { text-decoration: underline; }
    :host .auth-tenant-dropdown { border: 1px solid var(--border-color, #e0e0e0); border-radius: var(--radius-md, 6px); }
  `]
})
export class TenantSelectFormComponent implements OnInit {
  i18n = inject(I18nService);

  @Input() memberships: TenantMembership[] = [];
  @Input() pendingResult: GrcRecord | null = null;

  @Output() tenantSelected = new EventEmitter<GrcRecord>();
  @Output() backToLogin = new EventEmitter<void>();

  selectedTenantId = '';
  dropdownOptions: { label: string; value: string }[] = [];
  loading = false;

  ngOnInit(): void {
    this.dropdownOptions = this.memberships.map(m => ({ label: m.orgName || m.tenantId, value: m.tenantId }));
    const primary = this.memberships.find(m => m.isPrimary);
    this.selectedTenantId = primary?.tenantId ?? this.memberships[0]?.tenantId ?? '';
  }

  onSelectTenant(): void {
    if (!this.pendingResult || !this.selectedTenantId) return;
    this.loading = true;
    const res: GrcRecord = { ...this.pendingResult, tenantId: this.selectedTenantId };
    const chosen = this.memberships.find(m => m.tenantId === this.selectedTenantId);
    if (chosen) {
      res.role = chosen.role;
      res.orgName = chosen.orgName;
    }
    this.tenantSelected.emit(res);
  }
}
