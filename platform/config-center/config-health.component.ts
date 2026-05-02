import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfigCenterService, type EnvHealthReport, type SecretBindingReport, type ConfigDriftReport } from './config-center.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-health',
  standalone: true,
  imports: [
    CommonModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, SkeletonModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell
      icon="pi pi-heart"
      [title]="i18n.translate('configCenter.health')"
      [subtitle]="i18n.translate('configCenter.title')"
      [breadcrumbs]="['Admin', 'Config Center', 'Health']"
      [loading]="loading()">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="'Refresh'" (onClick)="loadAll()" [disabled]="loading()" styleClass="p-button-outlined" />
      </div>

      @if (envHealth()) {
        <div class="p-4 surface-card border-round shadow-1 mb-4">
          <h3>{{ i18n.translate('configCenter.envHealth') }}</h3>
          <div class="grid">
            <div class="col-3">
              <div class="text-sm text-color-secondary">Registered</div>
              <div class="text-2xl font-bold">{{ envHealth()!.totalRegistered }}</div>
            </div>
            <div class="col-3">
              <div class="text-sm text-color-secondary">Set</div>
              <div class="text-2xl font-bold text-green-500">{{ envHealth()!.totalSet }}</div>
            </div>
            <div class="col-3">
              <div class="text-sm text-color-secondary">Missing</div>
              <div class="text-2xl font-bold text-orange-500">{{ envHealth()!.totalMissing }}</div>
            </div>
            <div class="col-3">
              <div class="text-sm text-color-secondary">Status</div>
              <p-tag [value]="envHealth()!.overallStatus" [severity]="statusSeverity(envHealth()!.overallStatus)" />
            </div>
          </div>
          @if (envHealth()!.missingRequired.length > 0) {
            <div class="mt-3">
              <strong class="text-red-500">Missing Required:</strong>
              @for (k of envHealth()!.missingRequired; track k) {
                <p-tag [value]="k" severity="danger" style="margin-inline-start:0.25rem" />
              }
            </div>
          }
        </div>
      }

      @if (secretReport()) {
        <div class="p-4 surface-card border-round shadow-1 mb-4">
          <h3>{{ i18n.translate('configCenter.secretBindings') }}</h3>
          <div class="grid">
            <div class="col-4">
              <div class="text-sm text-color-secondary">Total Secrets</div>
              <div class="text-2xl font-bold">{{ secretReport()!.totalSecrets }}</div>
            </div>
            <div class="col-4">
              <div class="text-sm text-color-secondary">Bound</div>
              <div class="text-2xl font-bold text-green-500">{{ secretReport()!.bound }}</div>
            </div>
            <div class="col-4">
              <div class="text-sm text-color-secondary">Unbound</div>
              <div class="text-2xl font-bold text-red-500">{{ secretReport()!.unbound }}</div>
            </div>
          </div>
        </div>
      }

      @if (driftReport()) {
        <div class="p-4 surface-card border-round shadow-1">
          <h3>{{ i18n.translate('configCenter.drift') }}</h3>
          <p-tag [value]="driftReport()!.overallStatus" [severity]="statusSeverity(driftReport()!.overallStatus)" />
          <span style="margin-inline-start:0.5rem">{{ driftReport()!.totalDrift }} items</span>
          @if (driftReport()!.driftItems.length > 0) {
            <p-table [value]="driftReport()!.driftItems" styleClass="p-datatable-sm mt-3">
              <ng-template pTemplate="header">
                <tr>
                  <th>Key</th>
                  <th>Expected Source</th>
                  <th>Actual Source</th>
                  <th>Severity</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr>
                  <td>{{ row.key }}</td>
                  <td>{{ row.expectedSource }}</td>
                  <td>{{ row.actualSource }}</td>
                  <td><p-tag [value]="row.severity" [severity]="driftSeverity(row.severity)" /></td>
                </tr>
              </ng-template>
            </p-table>
          }
        </div>
      }
    </app-page-shell>
  `,
})
export class ConfigHealthComponent implements OnInit {
  i18n = inject(I18nService);
  private configService = inject(ConfigCenterService);
  private msg = inject(MessageService);

  loading = signal(false);
  envHealth = signal<EnvHealthReport | null>(null);
  secretReport = signal<SecretBindingReport | null>(null);
  driftReport = signal<ConfigDriftReport | null>(null);

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.configService.getEnvHealth().subscribe({
      next: (r) => this.envHealth.set(r),
      error: () => { this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load environment health' }); },
    });
    this.configService.getSecretBindings().subscribe({
      next: (r) => this.secretReport.set(r),
      error: () => { this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load secret bindings' }); },
    });
    this.configService.getDrift().subscribe({
      next: (r) => { this.driftReport.set(r); this.loading.set(false); },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load config drift report' });
        this.loading.set(false);
      },
    });
  }

  statusSeverity(s: string): string {
    switch (s) {
      case 'healthy': case 'clean': return 'success';
      case 'degraded': case 'drifted': return 'warning';
      default: return 'danger';
    }
  }

  driftSeverity(s: string): string {
    switch (s) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      default: return 'danger';
    }
  }
}
