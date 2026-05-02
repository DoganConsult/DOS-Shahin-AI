import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportsApiService, REPORT_TEMPLATES } from '../services/reports-api.service';
import type { ReportTemplate } from '../services/reports-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { GrcRecord } from '@app/core/models/shared.types';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-exports-page',
    imports: [CommonModule, AppDatePipe, FormsModule, WidgetShellComponent],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <!-- Template-based generation -->
      <section class="section">
        <h2>{{ i18n.isAr() ? 'إنشاء تقرير' : 'Generate Report' }}</h2>
        <div class="template-grid">
          @for (t of templates; track t.id) {
            <div class="template-card">
              <div class="tc-header">
                <span class="tc-icon">{{ t.icon }}</span>
                <div>
                  <div class="tc-title">{{ i18n.isAr() ? t.titleAr : t.titleEn }}</div>
                  <div class="tc-desc">{{ i18n.isAr() ? t.descriptionAr : t.descriptionEn }}</div>
                </div>
              </div>
              <div class="tc-actions">
                @for (fmt of t.formats; track fmt) {
                  <button class="fmt-btn" (click)="generate(t.key, fmt)">
                    <i class="pi" [ngClass]="fmtIcon(fmt)"></i> {{ fmt | uppercase }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Report catalog -->
      <section class="section">
        <h2>{{ i18n.isAr() ? 'التقارير المتاحة' : 'Report Catalog' }}</h2>
        <div class="filter-row">
          <input [(ngModel)]="searchTerm" (ngModelChange)="loadCatalog()"
            [placeholder]="i18n.isAr() ? 'بحث...' : 'Search...'" [attr.aria-label]="i18n.isAr() ? 'بحث...' : 'Search...'" class="search-input" />
        </div>
        <app-widget-shell [title]="''" [state]="catalogState()">
          @if (catalog()?.length) {
            <table [attr.aria-label]="(i18n.isAr() ? 'التقارير المتاحة' : 'Report Catalog') + ' table'" class="catalog-table">
              <thead>
                <tr>
                  <th>{{ i18n.isAr() ? 'العنوان' : 'Title' }}</th>
                  <th>{{ i18n.isAr() ? 'الوحدة' : 'Module' }}</th>
                  <th>{{ i18n.isAr() ? 'التاريخ' : 'Date' }}</th>
                  <th>{{ i18n.isAr() ? 'تحميل' : 'Download' }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of catalog(); track item.reportId || $index) {
                  <tr>
                    <td class="cat-title">{{ item.title }}</td>
                    <td>{{ item.module }}</td>
                    <td>{{ item.generatedAt | appDate:'medium' }}</td>
                    <td class="dl-cell">
                      <button aria-label="PDF" class="dl-btn" (click)="downloadPdf(item.reportId)" title="PDF">
                        <i class="pi pi-file-pdf"></i>
                      </button>
                      <button aria-label="Excel" class="dl-btn" (click)="downloadExcel(item.reportId)" title="Excel">
                        <i class="pi pi-file-excel"></i>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </app-widget-shell>
      </section>
    </div>
  `,
    styles: [`
    .page { padding: 24px 28px; }
    .section { margin-bottom: 28px; }
    h2 { font-size: 17px; font-weight: 600; margin: 0 0 14px; color: var(--text-heading, #111); }
    .template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .template-card {
      padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--surface-border, var(--border-subtle));
      background: var(--surface-card, #fff); display: flex; flex-direction: column; gap: 12px;
    }
    .tc-header { display: flex; gap: 10px; align-items: flex-start; }
    .tc-icon { font-size: var(--font-size-2xl); }
    .tc-title { font-size: var(--font-size-base); font-weight: 600; }
    .tc-desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .tc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .fmt-btn {
      display: flex; align-items: center; gap: 4px; padding: 5px 12px;
      border-radius: var(--radius-sm); border: 1px solid var(--surface-border);
      background: var(--surface-ground, #f9fafb); font-size: var(--font-size-xs); font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .fmt-btn:hover { background: var(--surface-200, var(--border-subtle)); }
    .filter-row { margin-bottom: 12px; }
    .search-input {
      padding: 8px 14px; border-radius: var(--radius); border: 1px solid var(--surface-border);
      font-size: var(--font-size-sm); width: 300px; max-width: 100%;
    }
    .catalog-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .catalog-table th { text-align: start; padding: 10px; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid var(--surface-border); }
    .catalog-table td { padding: 10px; border-bottom: 1px solid var(--surface-border, var(--surface-ice)); }
    .cat-title { font-weight: 600; }
    .dl-cell { display: flex; gap: 6px; }
    .dl-btn {
      padding: 4px 8px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border);
      background: transparent; cursor: pointer; font-size: var(--font-size-base);
    }
    .dl-btn:hover { background: var(--surface-ice); }
  `]
})
export class ExportsPageComponent implements OnInit {
  i18n = inject(I18nService);
  private reportsApi = inject(ReportsApiService);

  templates = REPORT_TEMPLATES;

  catalog = signal<GrcRecord[]>([]);
  catalogState = signal<LoadState>('loading');
  searchTerm = '';

  ngOnInit(): void { this.loadCatalog(); }

  async loadCatalog(): Promise<void> {
    this.catalogState.set('loading');
    try {
      const params: Record<string, string> = {};
      if (this.searchTerm) params['search'] = this.searchTerm;
      const res = await firstValueFrom(this.reportsApi.getCatalog(params));
      const items = (res?.['items'] ?? []) as GrcRecord[];
      this.catalog.set(items);
      this.catalogState.set(items.length ? 'ready' : 'empty');
    } catch {
      this.catalogState.set('error');
    }
  }

  generate(key: string, format: 'pdf' | 'html' | 'excel'): void {
    const lang = this.i18n.isAr() ? 'ar' : 'en';
    this.reportsApi.generateReport(key, format, lang).subscribe(blob => {
      const ext = format === 'excel' ? 'xlsx' : format;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${key}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  downloadPdf(reportId: string): void {
    const lang = this.i18n.isAr() ? 'ar' : 'en';
    this.reportsApi.downloadPdf(reportId, lang).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `report-${reportId}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  downloadExcel(reportId: string): void {
    this.reportsApi.downloadExcel(reportId).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `report-${reportId}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  fmtIcon(fmt: string): string {
    switch (fmt) {
      case 'pdf': return 'pi-file-pdf';
      case 'excel': return 'pi-file-excel';
      case 'html': return 'pi-globe';
      default: return 'pi-file';
    }
  }
}
