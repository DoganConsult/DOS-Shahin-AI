import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { AuditPackageComponent } from '@app/features/audit/pages/audit-package/audit-package.component';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-reports',
    imports: [CommonModule, FormsModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent,
        ExportButtonComponent, AuditPackageComponent, SkeletonModule, ToastModule, CardModule, ButtonModule,
        DropdownModule, TabViewModule, TableModule],
    providers: [MessageService],
    template: `
    <div class="ar-page" [attr.dir]="dir()">
      <app-page-header
        [titleEn]="'Audit Reports'"
        [titleAr]="'تقارير التدقيق'"
        [subtitleEn]="'Summaries, exports and audit packages'"
        [subtitleAr]="'ملخصات وتصدير وحزم التدقيق'"
        icon="file"
        [breadcrumbs]="[i18nSvc.translate('audit.dashboard'), i18nSvc.translate('audit.audit'), i18nSvc.translate('audit.reports')]"
        [isAr]="isAr"
        [dir]="dir()"
        [actions]="[]" />

      <div class="ar-body">
      @if (loading()) {
        <div style="display:flex;flex-direction:column;gap:12px;padding:20px 28px">
          <p-skeleton height="80px" borderRadius="10px" />
          <p-skeleton height="400px" borderRadius="10px" />
        </div>
      }
      @if (!loading()) {
      <p-toast />

      <p-tabView>
        <!-- Summary -->
        <p-tabPanel [header]="i18nSvc.translate('audit.summary')">
          <div class="kpi-grid" *ngIf="overview() as o">
            <app-stat-card icon="briefcase" [value]="o.activeAudits" [label]="i18nSvc.translate('audit.active')" accentColor="#3b82f6" />
            <app-stat-card icon="check" [value]="o.completedAudits" [label]="i18nSvc.translate('audit.completed')" accentColor="#22c55e" />
            <app-stat-card icon="search" [value]="o.totalFindings" [label]="i18nSvc.translate('audit.totalFindings')" accentColor="#ef4444" />
            <app-stat-card icon="percentage" [value]="o.closureRate + '%'" [label]="i18nSvc.translate('audit.closureRate')" accentColor="#8b5cf6" />
          </div>

          <!-- Per-audit report generation -->
          <p-card [header]="i18nSvc.translate('audit.generateAuditReport')" styleClass="mt-4">
            <div class="report-gen-row">
              <p-dropdown [options]="auditOptions()" [(ngModel)]="selectedAuditId" optionLabel="label" optionValue="value"
                [placeholder]="i18nSvc.translate('audit.selectAudit')" [filter]="true" styleClass="mr-2" />
              <p-button [label]="i18nSvc.translate('audit.generate')" icon="pi pi-file" (onClick)="generateReport()"
                [disabled]="!selectedAuditId" />
            </div>

            <div *ngIf="report()" class="report-content mt-3">
              <div class="report-header">
                <h3>{{ report().audit.title }}</h3>
                <app-status-badge [status]="report().audit.status" />
                <app-export-button module="audit-report" [data]="report()" />
              </div>
              <div class="report-stats">
                <span><strong>{{ i18nSvc.translate('audit.findings') }}:</strong> {{ report().summary.totalFindings }}</span>
                <span><strong>{{ i18nSvc.translate('audit.critical') }}:</strong> {{ report().summary.bySeverity.critical }}</span>
                <span><strong>{{ i18nSvc.translate('audit.high') }}:</strong> {{ report().summary.bySeverity.high }}</span>
                <span><strong>CAPA:</strong> {{ report().summary.totalCapa }}</span>
              </div>
              <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="report().findings" styleClass="p-datatable-sm mt-2">
                <ng-template pTemplate="header"><tr>
                  <th>{{ i18nSvc.translate('audit.titleLabel') }}</th><th>{{ i18nSvc.translate('audit.severity') }}</th><th>{{ i18nSvc.translate('audit.status') }}</th>
                </tr></ng-template>
                <ng-template pTemplate="body" let-f><tr>
                  <td>{{ f.title }}</td><td><app-status-badge [status]="f.severity" /></td><td><app-status-badge [status]="f.status" /></td>
                </tr></ng-template>
              </p-table>
            </div>
          </p-card>
        </p-tabPanel>

        <!-- Audit Package -->
        <p-tabPanel [header]="i18nSvc.translate('audit.auditPackage')">
          <app-audit-package />
        </p-tabPanel>
      </p-tabView>
      <!-- Cross-Module Links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="navigateTo('/audit/committee')"><i class="pi pi-building"></i> {{ i18nSvc.translate('audit.committeeDashboard') }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/audit/findings')"><i class="pi pi-search"></i> {{ i18nSvc.translate('audit.findings') }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/audit/finding-trends')"><i class="pi pi-chart-line"></i> {{ i18nSvc.translate('audit.trends') }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/risk/register')"><i class="pi pi-shield"></i> {{ i18nSvc.translate('audit.riskRegister') }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/compliance/overview')"><i class="pi pi-check-square"></i> {{ i18nSvc.translate('audit.compliance') }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/governance/overview')"><i class="pi pi-building"></i> {{ i18nSvc.translate('audit.governance') }}</button>
      </div>
      }
      </div>
    </div>
  `,
    styles: [`
    .ar-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }
    .ar-body { flex: 1; padding: 20px 28px 32px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .mt-4 { margin-top: 24px; } .mt-3 { margin-top: 16px; } .mt-2 { margin-top: 8px; }
    .report-gen-row { display: flex; align-items: center; gap: 12px; }
    .report-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .report-header h3 { margin: 0; font-size: var(--font-size-lg); }
    .report-stats { display: flex; gap: 20px; font-size: var(--font-size-base); }
    .report-content { padding: 16px; border: 1px solid var(--surface-border); border-radius: var(--radius); }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 20px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditReportsComponent implements OnInit {
  private api = inject(AuditApiService);
  private router = inject(Router);
  readonly i18nSvc = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  overview = signal<GrcRecord | null>(null);
  audits = signal<GrcRecord[]>([]);
  report = signal<GrcRecord | null>(null);
  selectedAuditId = '';

  get isAr() { return this.i18nSvc.currentLang() === 'ar'; }
  dir = computed(() => this.i18nSvc.direction() as 'ltr' | 'rtl');

  auditOptions = () => this.audits().map(a => ({ label: `${a.title} (${a.status})`, value: a.audit_id }));

  ngOnInit() {
    this.api.getOverview().subscribe({
      next: d => { this.overview.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.api.getPlans().subscribe({ next: r => this.audits.set((r as any).plans || []) });
  }

  generateReport() {
    if (!this.selectedAuditId) return;
    this.api.getReport(this.selectedAuditId).subscribe({
      next: r => this.report.set(r),
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToGenerateReport') })
    });
  }

  navigateTo(path: string) { this.router.navigate([path]); }
}
