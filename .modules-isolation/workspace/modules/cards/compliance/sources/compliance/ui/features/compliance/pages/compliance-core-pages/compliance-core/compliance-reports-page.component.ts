// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ButtonModule, NotificationModule, TagModule, TilesModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

interface ReportPack {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  icon: string;
  audience: string;
  formats: string[];
}

const REPORT_CATALOG: ReportPack[] = [
  { id: 'executive-pack', titleEn: 'Executive Pack', titleAr: 'حزمة تنفيذية', descriptionEn: 'High-level compliance posture, scores by framework and business unit, key risks and trends', icon: 'pi-briefcase', audience: 'C-Suite / Board', formats: ['pdf', 'pptx'] },
  { id: 'board-pack', titleEn: 'Board Pack', titleAr: 'حزمة مجلس الإدارة', descriptionEn: 'Board-ready compliance overview with governance KPIs, risk appetite alignment, and audit readiness', icon: 'pi-building', audience: 'Board of Directors', formats: ['pdf', 'pptx'] },
  { id: 'regulator-pack', titleEn: 'Regulator Pack', titleAr: 'حزمة الجهة الرقابية', descriptionEn: 'Framework-specific compliance report with obligation status, evidence coverage, and assessment results', icon: 'pi-shield', audience: 'Regulators / Auditors', formats: ['pdf', 'xlsx'] },
  { id: 'framework-report', titleEn: 'Framework Report', titleAr: 'تقرير الإطار', descriptionEn: 'Deep-dive into a single framework: obligation coverage, control mapping, gaps, and remediation roadmap', icon: 'pi-th-large', audience: 'Compliance Team', formats: ['pdf', 'xlsx'] },
  { id: 'business-unit-report', titleEn: 'Business Unit Report', titleAr: 'تقرير الوحدة التنظيمية', descriptionEn: 'Compliance posture by business unit with heatmap, scores, and action items', icon: 'pi-sitemap', audience: 'Department Heads', formats: ['pdf', 'xlsx'] },
  { id: 'evidence-report', titleEn: 'Evidence Report', titleAr: 'تقرير الأدلة', descriptionEn: 'Evidence freshness, coverage gaps, expiring items, and quality metrics', icon: 'pi-folder-open', audience: 'Evidence Owners', formats: ['pdf', 'xlsx'] },
  { id: 'gaps-report', titleEn: 'Gaps & Remediation Report', titleAr: 'تقرير الفجوات والمعالجة', descriptionEn: 'Open gaps by severity, remediation progress, overdue items, and closure rates', icon: 'pi-exclamation-triangle', audience: 'Risk & Compliance', formats: ['pdf', 'xlsx'] },
  { id: 'audit-package', titleEn: 'Audit Package', titleAr: 'حزمة التدقيق', descriptionEn: 'Full traceability matrix, evidence manifest, hash integrity, and chain of custody', icon: 'pi-verified', audience: 'External Auditors', formats: ['json', 'zip'] },
];

@Component({
    selector: 'app-compliance-reports-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [],
    imports: [CommonModule, RouterModule, ButtonModule, TilesModule, TagModule, NotificationModule, PageHeaderComponent],
    template: `
    <app-page-header titleEn="Compliance Reports" titleAr="تقارير الالتزام" icon="pi-file"
                     subtitleEn="Generate and download compliance report packs" subtitleAr="إنشاء وتحميل حزم تقارير الالتزام" />

    <div class="reports-grid">
      @for (pack of catalog(); track pack.id) {
        <cds-tile styleClass="report-card">
          <ng-template pTemplate="header">
            <div class="report-icon"><i [class]="'pi ' + pack.icon"></i></div>
          </ng-template>
          <h3>{{ pack.titleEn }}</h3>
          <p class="report-desc">{{ pack.descriptionEn }}</p>
          <div class="report-meta">
            <cds-tag [value]="pack.audience" severity="info" />
          </div>
          <ng-template pTemplate="footer">
            <div class="report-actions">
              @for (fmt of pack.formats; track fmt) {
                <button cdsButton [label]="fmt.toUpperCase()" class=" "
                        [icon]="fmt === 'pdf' ? '' : fmt === 'xlsx' ? '' : ''"
                        (click)="generate(pack.id, fmt)" [loading]="generating() === pack.id + '-' + fmt"></button>
              }
            </div>
          </ng-template>
        </cds-tile>
      }
    </div>

    <cds-notification></cds-notification>
  `,
    styles: [`
    :host { display: block; padding: 0 16px 24px; }
    .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 16px; }
    .report-card { height: 100%; }
    .report-icon { display: flex; justify-content: center; padding: 20px 0 8px; }
    .report-icon i { font-size: var(--font-size-4xl); color: var(--primary, #3b82f6); }
    h3 { margin: 0 0 8px; font-size: var(--font-size-body-md); color: var(--text-body, #1e293b); }
    .report-desc { font-size: var(--font-size-tag); color: var(--text-muted, #64748b); line-height: 1.5; margin: 0 0 12px; }
    .report-meta { margin-bottom: 12px; }
    .report-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  `]
})
export class ComplianceReportsPageComponent implements OnInit {
  private msg = inject(MessageService);

  private readonly api = inject(ComplianceFeatureApiService);
  private readonly msg = inject(MessageService);

  catalog = signal(REPORT_CATALOG); // initialized with static fallback, then overwritten by API
  generating = signal('');
  loading = signal(true);

  ngOnInit(): void {
    // Load catalog from DB-driven API endpoint; fall back to static catalog
    this.api.getReportsCatalog().subscribe({
      next: (data) => {
        const apiCatalog = data?.reports || [];
        if (apiCatalog.length > 0) {
          // Merge API catalog with static enrichment data (icons, descriptions)
          const enriched = apiCatalog.map((r: any) => {
            const staticMatch = REPORT_CATALOG.find(s => s.id === r.id);
            return {
              ...r,
              titleEn: r.name || staticMatch?.titleEn || r.id,
              titleAr: staticMatch?.titleAr || r.name,
              descriptionEn: staticMatch?.descriptionEn || '',
              icon: staticMatch?.icon || 'pi-file',
              audience: r.audience || staticMatch?.audience || '',
              formats: r.formats || staticMatch?.formats || ['pdf'],
            };
          });
          this.catalog.set(enriched);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false) // keep static fallback
    });
  }

  generate(packId: string, format: string): void {
    this.generating.set(`${packId}-${format}`);

    if (packId === 'audit-package') {
      this.api.getAuditPackage().subscribe({
        next: (data) => {
          this.api.downloadAuditPackageJson(data, `audit-package-${new Date().toISOString().slice(0, 10)}.json`);
          this.msg.add({ severity: 'success', summary: 'Audit package downloaded' });
          this.generating.set('');
        },
        error: () => { this.msg.add({ severity: 'error', summary: 'Failed to generate audit package' }); this.generating.set(''); }
      });
    } else {
      // DB-driven report generation via unified endpoint
      this.api.runReport({ reportId: packId, format }).subscribe({
        next: (result) => {
          this.msg.add({ severity: 'success', summary: `${packId} report queued`, detail: `Run ID: ${result?.runId ?? '—'}` });
          this.generating.set('');
        },
        error: () => { this.msg.add({ severity: 'error', summary: 'Failed to generate report' }); this.generating.set(''); }
      });
    }

    // Legacy format-specific download fallback (kept for audit-package)
    if (packId !== 'audit-package' && (format === 'pdf' || format === 'xlsx' || format === 'zip')) {
      this.api.downloadAuditPack(format as any).subscribe({
        next: () => {},
        error: () => {}
      });
      this.generating.set('');
    }
  }
}
