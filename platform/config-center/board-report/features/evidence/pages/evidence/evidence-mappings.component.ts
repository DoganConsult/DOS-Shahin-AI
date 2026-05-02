import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription } from 'rxjs';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceMapping {
  attachment_id: string; entity_type: string; entity_id: string;
  evidence_type_code: string; file_name: string; file_size_bytes: number;
  uploaded_by: string; created_at: string; entity_title: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-mappings',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, DropdownModule, TooltipModule],
    styles: [`
    .stat-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-box { padding: 14px 20px; border-radius: var(--radius-md); background: var(--surface-card); border: 1px solid var(--surface-border); min-width: 140px; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .filter-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .empty-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary); }
    .entity-link { color: var(--primary-500); cursor: pointer; text-decoration: underline; }
  `],
    template: `
    <app-page-shell icon="sitemap"
      [title]="i18n.translate('evidenceMappings.title')"
      [subtitle]="i18n.translate('evidenceMappings.subtitle')"
      [breadcrumbs]="['Dashboard', 'Evidence', 'Mappings']"
      [loading]="loading">

      <div class="stat-row">
        <div class="stat-box"><div class="stat-value">{{ mappings.length }}</div><div class="stat-label">{{ i18n.translate('evidenceMappings.totalMappings') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ controlCount }}</div><div class="stat-label">{{ i18n.translate('nav.controls') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ policyCount }}</div><div class="stat-label">{{ i18n.translate('nav.policies') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ riskCount }}</div><div class="stat-label">{{ i18n.translate('nav.risks') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ frameworkCount }}</div><div class="stat-label">{{ i18n.translate('nav.frameworks') }}</div></div>
      </div>

      <div class="filter-row">
        <p-dropdown [options]="entityTypeOptions" [(ngModel)]="filterEntityType" optionLabel="label" optionValue="value"
          [placeholder]="i18n.translate('evidenceMappings.entityType')" [showClear]="true" (onChange)="loadData()" />
      </div>

      @if (mappings.length === 0 && !loading) {
        <div class="empty-state">
          <i class="pi pi-sitemap" style="font-size:40px;opacity:.3;display:block;margin-bottom:12px"></i>
          {{ i18n.translate('evidenceMappings.noMappings') }}
        </div>
      }

      @if (mappings.length > 0) {
        <p-card>
          <p-table aria-label="Mappings table" [value]="mappings" [paginator]="true" [rows]="20" styleClass="p-datatable-sm"
            [globalFilterFields]="['entity_type','entity_title','evidence_type_code','file_name']">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('evidenceMappings.entityType') }}</th>
                <th>{{ i18n.translate('evidenceMappings.entityName') }}</th>
                <th>{{ i18n.translate('evidenceMappings.evidenceType') }}</th>
                <th>{{ i18n.translate('evidenceMappings.fileName') }}</th>
                <th>{{ i18n.translate('evidenceMappings.size') }}</th>
                <th>{{ i18n.translate('evidenceMappings.uploadedBy') }}</th>
                <th>{{ i18n.translate('evidenceMappings.date') }}</th>
                <th>{{ i18n.translate('common.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-m>
              <tr>
                <td><p-tag [value]="m.entity_type" [severity]="entitySeverity(m.entity_type)" /></td>
                <td>{{ m.entity_title || m.entity_id }}</td>
                <td>{{ m.evidence_type_code }}</td>
                <td>{{ m.file_name }}</td>
                <td>{{ formatSize(m.file_size_bytes) }}</td>
                <td>{{ m.uploaded_by || '-' }}</td>
                <td>{{ m.created_at | appDate:'medium' }}</td>
                <td>
                  <button aria-label="Open" pButton icon="pi pi-external-link" class="p-button-text p-button-sm"
                    (click)="drillDown(m)" pTooltip="View in Vault"></button>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      }
    </app-page-shell>
  `
})
export class EvidenceMappingsComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private readonly live = inject(GrcLiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private sub?: Subscription;

  loading = true;
  mappings: EvidenceMapping[] = [];
  filterEntityType = '';

  entityTypeOptions = [
    { label: 'Control', value: 'control' }, { label: 'Policy', value: 'policy' },
    { label: 'Risk', value: 'risk' }, { label: 'Framework', value: 'framework' },
  ];

  get controlCount() { return this.mappings.filter(m => m.entity_type === 'control').length; }
  get policyCount() { return this.mappings.filter(m => m.entity_type === 'policy').length; }
  get riskCount() { return this.mappings.filter(m => m.entity_type === 'risk').length; }
  get frameworkCount() { return this.mappings.filter(m => m.entity_type === 'framework').length; }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      this.filterEntityType = '';
      if (p['controlId']) this.filterEntityType = 'control';
      else if (p['policyId']) this.filterEntityType = 'policy';
      else if (p['riskId']) this.filterEntityType = 'risk';
      else if (p['frameworkId']) this.filterEntityType = 'framework';
      this.loadData();
    });
    this.sub = this.live.evidence$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadData());
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  loadData() {
    this.loading = true;
    const qp = this.route.snapshot.queryParams;
    const params: Record<string, string> = {};
    if (this.filterEntityType) params['entityType'] = this.filterEntityType;
    if (qp['controlId']) params['controlId'] = qp['controlId'];
    if (qp['policyId']) params['policyId'] = qp['policyId'];
    if (qp['riskId']) params['riskId'] = qp['riskId'];
    if (qp['frameworkId']) params['frameworkId'] = qp['frameworkId'];
    const qs = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    this.apiclientSvc.get(`/evidence/mappings${qs ? '?' + qs : ''}`).subscribe({
      next: (data: Record<string, unknown>) => { this.mappings = (data.mappings || []) as any; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  entitySeverity(type: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (type) {
      case 'control': return 'info';
      case 'policy': return 'success';
      case 'risk': return 'danger';
      case 'framework': return 'warning';
      default: return 'info';
    }
  }

  formatSize(bytes: number): string {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  drillDown(m: EvidenceMapping) {
    this.router.navigate(['/evidence/vault'], { queryParams: { linkedType: m.entity_type, linkedId: m.entity_id } });
  }
}
