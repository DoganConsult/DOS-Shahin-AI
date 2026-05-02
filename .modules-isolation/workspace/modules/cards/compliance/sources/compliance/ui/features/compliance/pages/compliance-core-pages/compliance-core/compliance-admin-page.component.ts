// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import type { ComplianceSettingsDto } from '../../../models/compliance.models';
import { ButtonModule, DropdownModule, InputModule, NotificationModule, NumberModule, PlaceholderModule, TabsModule, ToggleModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    selector: 'app-compliance-admin-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [],
    imports: [
        CommonModule, FormsModule, RouterModule, TabsModule, ButtonModule,
        InputModule, NumberModule, DropdownModule,
        ToggleModule, PlaceholderModule, NotificationModule, PageHeaderComponent,
    ],
    template: `
    <app-page-header titleEn="Compliance Admin" titleAr="إعدادات الالتزام" icon="pi-cog"
                     subtitleEn="Module configuration and administration" subtitleAr="تكوين الموديول والإدارة" />

    @if (loading()) {
      <cds-placeholder></cds-placeholder>
    } @else {
      <cds-tabs>
        <!-- Display Settings -->
        <cds-tab header="Display" leftIcon="">
          <div class="settings-grid">
            <div class="setting-field">
              <label>Overview Controls Limit</label>
              <cds-number [(ngModel)]="settings.overviewControlsLimit" [min]="5" [max]="100" />
            </div>
            <div class="setting-field">
              <label>Overview Evidence Limit</label>
              <cds-number [(ngModel)]="settings.overviewEvidenceLimit" [min]="5" [max]="100" />
            </div>
            <div class="setting-field">
              <label>Overview Findings Limit</label>
              <cds-number [(ngModel)]="settings.overviewFindingsLimit" [min]="5" [max]="100" />
            </div>
            <div class="setting-field">
              <label>Include Domain Health</label>
              <cds-toggle [(ngModel)]="settings.overviewIncludeDomainHealth" onLabel="Yes" offLabel="No" />
            </div>
            <div class="setting-field">
              <label>Default Page Size</label>
              <cds-number [(ngModel)]="settings.paginationDefaultPageSize" [min]="10" [max]="100" />
            </div>
            <div class="setting-field">
              <label>Max Page Size</label>
              <cds-number [(ngModel)]="settings.paginationMaxPageSize" [min]="50" [max]="500" />
            </div>
            <div class="setting-field">
              <label>Cache TTL (seconds)</label>
              <cds-number [(ngModel)]="settings.cacheTtlSeconds" [min]="0" [max]="3600" />
            </div>
          </div>
          <div class="actions-bar">
            <button cdsButton label="Save Settings" icon="" (click)="saveSettings()"></button>
          </div>
        </cds-tab>

        <!-- Scoring Rules -->
        <cds-tab header="Scoring" leftIcon="">
          <div class="panel-info">
            <p>Scoring rules are managed through the Scoring Policy Engine.</p>
            <button cdsButton label="Open Scoring Policy Engine" icon="" class=""
                    routerLink="/compliance/scoring-policy"></button>
          </div>
        </cds-tab>

        <!-- Framework Import -->
        <cds-tab header="Import" leftIcon="">
          <div class="panel-info">
            <p>Import regulatory frameworks and obligations from CSV, Excel, or JSON feeds.</p>
            <button cdsButton label="Import Framework" icon="" class=""
                    routerLink="/compliance/frameworks" [queryParams]="{action: 'import'}"></button>
          </div>
        </cds-tab>

        <!-- Workflow Rules -->
        <cds-tab header="Workflows" leftIcon="">
          <div class="panel-info">
            <p>Compliance assessment, attestation, and exception workflows are configured in the Workflow module.</p>
            <button cdsButton label="Open Workflow Templates" icon="" class=""
                    routerLink="/workflow/templates"></button>
          </div>
        </cds-tab>

        <!-- Connectors -->
        <cds-tab header="Connectors" leftIcon="">
          <div class="panel-info">
            <p>Evidence source connectors and regulatory feed connectors are managed in the Evidence and Regulatory modules.</p>
            <button cdsButton label="Evidence Connectors" icon="" class=" p-mr-2"
                    routerLink="/foundation/evidence" [queryParams]="{tab: 'connectors'}"></button>
          </div>
        </cds-tab>
      </cds-tabs>
    }

    <cds-notification></cds-notification>
  `,
    styles: [`
    :host { display: block; padding: 0 16px 24px; }
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; padding: 16px 0; }
    .setting-field { display: flex; flex-direction: column; gap: 6px; }
    .setting-field label { font-size: var(--font-size-tag); font-weight: 600; color: var(--text-muted, #64748b); }
    .actions-bar { padding: 16px 0; border-top: 1px solid var(--border, #e2e8f0); margin-top: 16px; }
    .panel-info { padding: 24px 0; }
    .panel-info p { color: var(--text-muted, #64748b); margin-bottom: 16px; }
  `]
})
export class ComplianceAdminPageComponent implements OnInit {
  private msg = inject(MessageService);

  private readonly api = inject(ComplianceFeatureApiService);
  private readonly msg = inject(MessageService);

  loading = signal(true);
  settings: any = {
    overviewControlsLimit: 20,
    overviewEvidenceLimit: 20,
    overviewFindingsLimit: 20,
    overviewRemediationLimit: 20,
    overviewIncludeDomainHealth: true,
    cacheTtlSeconds: 300,
    paginationDefaultPageSize: 25,
    paginationMaxPageSize: 100,
    gapsListLimit: 50,
  };

  ngOnInit(): void {
    this.api.getSettings().subscribe({
      next: (data) => { Object.assign(this.settings, data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  saving = signal(false);

  saveSettings(): void {
    this.saving.set(true);
    this.api.updateSettings(this.settings).subscribe({
      next: () => {
        this.saving.set(false);
        this.msg.add({ severity: 'success', summary: 'Settings saved', detail: 'Compliance module settings have been persisted.' });
      },
      error: () => {
        this.saving.set(false);
        this.msg.add({ severity: 'error', summary: 'Failed to save settings' });
      }
    });
  }
}
