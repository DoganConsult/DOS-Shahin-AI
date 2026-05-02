import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { SessionService } from '@app/dauth/session/session.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { StorageService } from '@app/infrastructure';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-package',
    imports: [
        CommonModule, FormsModule, PageShellComponent,
        CardModule, TableModule, TagModule, ButtonModule,
        TabViewModule, DialogModule, InputTextModule, InputTextarea, TooltipModule, AppDatePipe, RaciPanelComponent
    ],
    template: `
    <app-page-shell icon="briefcase" [title]="i18n.translate('auditPackage.title')"
      [subtitle]="i18n.translate('auditPackage.subtitle')"
      [breadcrumbs]="[i18n.translate('auditPackage.breadcrumbDashboard'), i18n.translate('auditPackage.breadcrumbAuditPackages')]" [loading]="loading">
      <app-raci-panel entityType="audit" [entityId]="selectedPackage?.id || ''" [canEdit]="true" />

      <!-- Summary stats -->
      <div class="grid mb-3">
        <div class="col-12 md:col-3"><div class="stat-box"><div class="stat-value">{{ packages.length }}</div><div class="stat-label">{{ i18n.translate('auditPackage.totalPackages') }}</div></div></div>
        <div class="col-12 md:col-3"><div class="stat-box"><div class="stat-value">{{ draftCount }}</div><div class="stat-label">{{ i18n.translate('auditPackage.draft') }}</div></div></div>
        <div class="col-12 md:col-3"><div class="stat-box"><div class="stat-value">{{ finalizedCount }}</div><div class="stat-label">{{ i18n.translate('auditPackage.finalized') }}</div></div></div>
        <div class="col-12 md:col-3"><div class="stat-box"><div class="stat-value">{{ totalControls }}</div><div class="stat-label">{{ i18n.translate('auditPackage.totalControls') }}</div></div></div>
      </div>

      <!-- Detail view when a package is selected -->
      @if (selectedPackage) {
        <p-card class="mb-3">
          <div class="flex align-items-center gap-3 mb-3">
            <h3 class="m-0">{{ selectedPackage.name || selectedPackage.title }}</h3>
            <p-tag [value]="selectedPackage.status" [severity]="selectedPackage.status === 'finalized' ? 'success' : 'warning'" />
            <span class="flex-grow-1"></span>
            @if (selectedPackage.status === 'draft') {
              <p-button [label]="i18n.translate('auditPackage.finalize')" icon="pi pi-check-circle" severity="success" (onClick)="finalizePackage(selectedPackage)" />
            }
            <p-button [label]="i18n.translate('auditPackage.close')" icon="pi pi-times" [text]="true" (onClick)="selectedPackage = null" />
          </div>

          <p-tabView>
            <!-- Control List -->
            <p-tabPanel [header]="i18n.translate('auditPackage.controlList')">
              <p-table [attr.aria-label]="i18n.translate('auditPackage.ariaControlListTable')" [value]="selectedPackage.controls || []" styleClass="p-datatable-sm" [paginator]="true" [rows]="10">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ i18n.translate('auditPackage.controlId') }}</th>
                    <th>{{ i18n.translate('auditPackage.name') }}</th>
                    <th>{{ i18n.translate('auditPackage.status') }}</th>
                    <th>{{ i18n.translate('auditPackage.effectiveness') }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-ctrl>
                  <tr>
                    <td><code>{{ ctrl.control_id || ctrl.id }}</code></td>
                    <td>{{ ctrl.name || ctrl.title }}</td>
                    <td><p-tag [value]="ctrl.status || 'mapped'" [severity]="ctrl.status === 'tested' ? 'success' : ctrl.status === 'failed' ? 'danger' : 'info'" /></td>
                    <td>{{ ctrl.effectiveness || '-' }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="4" class="text-center p-3 text-color-secondary">{{ i18n.translate('auditPackage.noControls') }}</td></tr>
                </ng-template>
              </p-table>
            </p-tabPanel>

            <!-- Evidence Bundle -->
            <p-tabPanel [header]="i18n.translate('auditPackage.evidenceBundle')">
              <p-table [attr.aria-label]="i18n.translate('auditPackage.ariaEvidenceBundleTable')" [value]="selectedPackage.evidence || []" styleClass="p-datatable-sm" [paginator]="true" [rows]="10">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ i18n.translate('auditPackage.evidence') }}</th>
                    <th>{{ i18n.translate('auditPackage.control') }}</th>
                    <th>{{ i18n.translate('auditPackage.type') }}</th>
                    <th>{{ i18n.translate('auditPackage.date') }}</th>
                    <th>{{ i18n.translate('auditPackage.hash') }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-ev>
                  <tr>
                    <td>{{ ev.name || ev.title }}</td>
                    <td>{{ ev.control_id || '-' }}</td>
                    <td><p-tag [value]="ev.type || 'document'" /></td>
                    <td>{{ ev.collected_at || ev.created_at | appDate:'short' }}</td>
                    <td><code class="hash-text" *ngIf="ev.hash">{{ ev.hash | slice:0:12 }}...</code></td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="5" class="text-center p-3 text-color-secondary">{{ i18n.translate('auditPackage.noEvidence') }}</td></tr>
                </ng-template>
              </p-table>
            </p-tabPanel>

            <!-- Traceability Matrix -->
            <p-tabPanel [header]="i18n.translate('auditPackage.traceabilityMatrix')">
              <p-table [attr.aria-label]="i18n.translate('auditPackage.ariaTraceabilityTable')" [value]="selectedPackage.traceability || []" styleClass="p-datatable-sm" [paginator]="true" [rows]="10">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ i18n.translate('auditPackage.requirement') }}</th>
                    <th>{{ i18n.translate('auditPackage.control') }}</th>
                    <th>{{ i18n.translate('auditPackage.evidence') }}</th>
                    <th>{{ i18n.translate('auditPackage.status') }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr>
                    <td>{{ row.requirement || row.requirement_id }}</td>
                    <td>{{ row.control || row.control_id }}</td>
                    <td>{{ row.evidence || row.evidence_id }}</td>
                    <td>
                      <p-tag [value]="row.status || 'mapped'"
                        [severity]="row.status === 'verified' ? 'success' : row.status === 'gap' ? 'danger' : 'warning'" />
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="4" class="text-center p-3 text-color-secondary">{{ i18n.translate('auditPackage.noTraceability') }}</td></tr>
                </ng-template>
              </p-table>
            </p-tabPanel>

            <!-- Hash Manifest -->
            <p-tabPanel [header]="i18n.translate('auditPackage.hashManifest')">
              <div class="hash-manifest">
                <div class="manifest-header flex align-items-center gap-2 mb-3">
                  <i class="pi pi-shield text-lg"></i>
                  <span class="font-semibold">{{ i18n.translate('auditPackage.packageChainHash') }}</span>
                </div>
                @if (selectedPackage.manifest_hash) {
                  <div class="manifest-box mb-3">
                    <label class="text-sm text-color-secondary">{{ i18n.translate('auditPackage.rootHash') }}</label>
                    <code class="block mt-1">{{ selectedPackage.manifest_hash }}</code>
                  </div>
                }
                <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('auditPackage.ariaHashManifestTable')" [value]="selectedPackage.hash_entries || []" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>{{ i18n.translate('auditPackage.entry') }}</th>
                      <th>{{ i18n.translate('auditPackage.type') }}</th>
                      <th>{{ i18n.translate('auditPackage.hash') }}</th>
                      <th>{{ i18n.translate('auditPackage.timestamp') }}</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-entry>
                    <tr>
                      <td>{{ entry.name || entry.entity_id }}</td>
                      <td><p-tag [value]="entry.type || 'evidence'" /></td>
                      <td><code class="hash-text">{{ entry.hash }}</code></td>
                      <td>{{ entry.timestamp || entry.created_at | appDate:'medium' }}</td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr><td colspan="4" class="text-center p-3 text-color-secondary">{{ i18n.translate('auditPackage.noHashEntries') }}</td></tr>
                  </ng-template>
                </p-table>
              </div>
            </p-tabPanel>
          </p-tabView>
        </p-card>
      }

      <!-- Packages list -->
      <p-card>
        <div class="mb-3 flex align-items-center gap-2">
          <span class="font-semibold text-lg">{{ i18n.translate('auditPackage.allPackages') }}</span>
          <span class="flex-grow-1"></span>
          <p-button [label]="i18n.translate('auditPackage.downloadZip')" icon="pi pi-download" [outlined]="true" (onClick)="downloadZip()" />
          <p-button [label]="i18n.translate('auditPackage.newPackage')" icon="pi pi-plus" (onClick)="openCreateDialog()" />
        </div>
        <p-table [attr.aria-label]="i18n.translate('auditPackage.ariaPackagesTable')" [value]="packages" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('auditPackage.name') }}</th>
              <th>{{ i18n.translate('auditPackage.status') }}</th>
              <th>{{ i18n.translate('auditPackage.controls') }}</th>
              <th>{{ i18n.translate('auditPackage.evidence') }}</th>
              <th>{{ i18n.translate('auditPackage.created') }}</th>
              <th>{{ i18n.translate('auditPackage.actions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-pkg>
            <tr>
              <td>{{ pkg.name || pkg.title }}</td>
              <td><p-tag [value]="pkg.status" [severity]="pkg.status === 'finalized' ? 'success' : 'warning'" /></td>
              <td>{{ pkg.control_count || (pkg.controls || []).length }}</td>
              <td>{{ pkg.evidence_count || (pkg.evidence || []).length }}</td>
              <td>{{ pkg.created_at | appDate:'short' }}</td>
              <td class="flex gap-1">
                <p-button icon="pi pi-eye" [text]="true" severity="info" (onClick)="viewPackage(pkg)" [pTooltip]="i18n.translate('auditPackage.tooltipViewDetails')" />
                @if (pkg.status === 'draft') {
                  <p-button icon="pi pi-check-circle" [text]="true" severity="success" (onClick)="finalizePackage(pkg)" [pTooltip]="i18n.translate('auditPackage.tooltipFinalize')" />
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deletePackage(pkg)" [pTooltip]="i18n.translate('auditPackage.tooltipDelete')" />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center p-4">
              <i class="pi pi-inbox" style="font-size:1.5rem; display:block; margin-bottom:8px"></i>
              {{ i18n.translate('auditPackage.noPackages') }}
            </td></tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Create Package Dialog -->
      <p-dialog [header]="i18n.translate('auditPackage.newAuditPackage')" [(visible)]="createDialogVisible" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3 pt-3">
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('auditPackage.name') }}</label>
            <input pInputText [(ngModel)]="newPackage.name" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('auditPackage.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="newPackage.description" rows="3"></textarea>
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('auditPackage.framework') }}</label>
            <input pInputText [(ngModel)]="newPackage.framework_id" [placeholder]="i18n.translate('auditPackage.frameworkIdPlaceholder')" [attr.aria-label]="i18n.translate('auditPackage.ariaFrameworkId')" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('auditPackage.cancel')" icon="pi pi-times" [text]="true" (onClick)="createDialogVisible = false" />
          <p-button [label]="i18n.translate('auditPackage.create')" icon="pi pi-check" (onClick)="createPackage()" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
    styles: [`
    .stat-box { text-align: center; padding: 1rem; background: var(--surface-card); border-radius: var(--radius-sm); }
    .stat-value { font-size: var(--font-size-2xl); font-weight: var(--font-bold); color: var(--primary-color); }
    .stat-box.warn .stat-value { color: var(--orange-500); }
    .stat-label { font-size: var(--font-size-tag); color: var(--text-color-secondary); }
    .hash-text { font-size: var(--font-size-sm); word-break: break-all; background: var(--surface-ground); padding: 2px 6px; border-radius: var(--radius-xs); }
    .manifest-box { padding: 1rem; background: var(--surface-ground); border-radius: var(--radius-sm); border: 1px solid var(--surface-border); }
    .manifest-box code { font-size: var(--font-size-tag); word-break: break-all; }
  `]
})
export class AuditPackageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private live = inject(GrcLiveService);
  private cdr = inject(ChangeDetectorRef);
  loading = false;

  packages: Record<string, any>[] = [];
  selectedPackage: Record<string, any> | null = null;

  draftCount = 0;
  finalizedCount = 0;
  totalControls = 0;

  createDialogVisible = false;
  newPackage: Record<string, any> = {};

  private auth = inject(SessionService);
  private _storage = inject(StorageService);
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadPackages());
    this.loadPackages();
  }

  private loadPackages(): void {
    this.loading = true;
    this.apiclientSvc.get('/audit-packages').subscribe({
      next: (d: Record<string, any>) => {
        this.packages = asArray(d, 'packages');
        this.updateStats();
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private updateStats(): void {
    this.draftCount = this.packages.filter((p: Record<string, unknown>) => p.status === 'draft').length;
    this.finalizedCount = this.packages.filter((p: Record<string, unknown>) => p.status === 'finalized').length;
    this.totalControls = this.packages.reduce((sum: number, p: Record<string, any>) => sum + (p.control_count || (p.controls || []).length), 0);
  }

  viewPackage(pkg: Record<string, any>): void {
    this.loading = true;
    this.apiclientSvc.get(`/audit-packages/${pkg.id}`).subscribe({
      next: (d: Record<string, any>) => {
        this.selectedPackage = d.package || d || pkg;
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => {
        this.selectedPackage = pkg;
        this.loading = false; this.cdr.markForCheck();
      }
    });
  }

  finalizePackage(pkg: Record<string, any>): void {
    this.apiclientSvc.post(`/audit-packages/${pkg.id}/finalize`, {}).subscribe({
      next: () => {
        this.loadPackages();
        if (this.selectedPackage && this.selectedPackage.id === pkg.id) {
          this.viewPackage(pkg);
        }
      }
    });
  }

  deletePackage(pkg: Record<string, any>): void {
    this.apiclientSvc.del(`/audit-packages/${pkg.id}`).subscribe({
      next: () => {
        if (this.selectedPackage && this.selectedPackage.id === pkg.id) {
          this.selectedPackage = null;
        }
        this.loadPackages();
      }
    });
  }

  openCreateDialog(): void {
    this.newPackage = {};
    this.createDialogVisible = true;
  }

  createPackage(): void {
    if (!this.newPackage.name) return;
    this.apiclientSvc.post('/audit-packages', this.newPackage).subscribe({
      next: () => {
        this.createDialogVisible = false;
        this.loadPackages();
      }
    });
  }

  downloadZip(): void {
    const tenantId = this.auth.tenantId() ?? this._storage.get('grc_tenantId') ?? '';
    if (!tenantId) return;
    this.apiclientSvc.getBlob('/audit-package/' + tenantId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit-package-' + tenantId + '.zip';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }
}
