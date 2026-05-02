import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback) || fallback;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ucf-browser',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
    CardModule, ToolbarModule, InputTextModule, DropdownModule,
    ButtonModule, TagModule, TableModule, ToastModule
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="book"
      [title]="i18n.translate('grcOs.ucfBrowser')"
      [subtitle]="i18n.translate('grcOs.ucf')"
      [breadcrumbs]="['Dashboard', 'UCF Browser']"
      [loading]="loading">

      <p-toast />
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   placeholder="Search controls..." aria-label="Search controls..." (input)="applyFilter()" />
          </span>
          <p-dropdown class="ms-2" [options]="frameworkOptions" [(ngModel)]="selectedFramework"
                      placeholder="Filter by Framework" (onChange)="applyFilter()" [showClear]="true" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button label="Export Dictionary" icon="pi pi-download" severity="secondary" (onClick)="exportDictionary()" />
        </ng-template>
      </p-toolbar>

      <p-card>
        <div class="grid mb-3">
          <div class="col-3">
            <div class="stat-box">
              <div class="stat-value">{{ controls.length }}</div>
              <div class="stat-label">Total Controls</div>
            </div>
          </div>
          <div class="col-3">
            <div class="stat-box">
              <div class="stat-value">{{ mappedCount }}</div>
              <div class="stat-label">Mapped</div>
            </div>
          </div>
          <div class="col-3">
            <div class="stat-box">
              <div class="stat-value">{{ activeCount }}</div>
              <div class="stat-label">Active</div>
            </div>
          </div>
          <div class="col-3">
            <div class="stat-box">
              <div class="stat-value">{{ frameworks.length }}</div>
              <div class="stat-label">Frameworks</div>
            </div>
          </div>
        </div>

        <p-table aria-label="Filtered Controls table" [value]="filteredControls" [paginator]="true" [rows]="15" [showCurrentPageReport]="true"
                 styleClass="p-datatable-sm" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>ID</th>
              <th>Title (EN)</th>
              <th>Title (AR)</th>
              <th>Framework</th>
              <th>Status</th>
              <th>Mappings</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-ctrl>
            <tr>
              <td>{{ ctrl.control_id }}</td>
              <td>{{ ctrl.title_en }}</td>
              <td class="text-right" dir="rtl">{{ ctrl.title_ar }}</td>
              <td><p-tag [value]="ctrl.framework" /></td>
              <td><app-status-badge [status]="ctrl.status" /></td>
              <td>{{ ctrl.mapping_count || 0 }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center p-4">No controls found</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>
  `,
  styles: [`
    .stat-box { text-align: center; padding: 1rem; background: var(--surface-card); border-radius: var(--radius); }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--primary-color); }
    .stat-label { font-size: var(--font-size-tag); color: var(--text-color-secondary); }
  `]
})
export class UCFBrowserComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  searchTerm = '';
  selectedFramework: string | null = null;
  controls: Record<string, unknown>[] = [];
  filteredControls: Record<string, unknown>[] = [];
  frameworks: string[] = [];
  frameworkOptions: Record<string, unknown>[] = [];
  mappedCount = 0;
  activeCount = 0;

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/ucf/controls').subscribe({
      next: (data: unknown) => {
        const payload = asRecord(data);
        this.controls = Array.isArray(data) ? asRecordArray(data) : asRecordArray(payload['controls']);
        this.frameworks = [...new Set(this.controls.map((c) => asString(c['framework'])).filter(Boolean))];
        this.frameworkOptions = this.frameworks.map(f => ({ label: f, value: f }));
        this.mappedCount = this.controls.filter((c) => asNumber(c['mapping_count']) > 0).length;
        this.activeCount = this.controls.filter((c) => asString(c['status']) === 'active').length;
        this.filteredControls = [...this.controls];
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  applyFilter() {
    let result = [...this.controls];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c =>
        asString(c['title_en']).toLowerCase().includes(term) ||
        asString(c['title_ar']).includes(this.searchTerm) ||
        asString(c['control_id']).toLowerCase().includes(term)
      );
    }
    if (this.selectedFramework) {
      result = result.filter(c => asString(c['framework']) === this.selectedFramework);
    }
    this.filteredControls = result;
  }

  private msg = inject(MessageService);

  exportDictionary() {
    const csv = ['ID,Title EN,Title AR,Framework,Status,Mappings'];
    this.filteredControls.forEach(c => {
      csv.push(`${c.control_id},"${c.title_en}","${c.title_ar}",${c.framework},${c.status},${c.mapping_count || 0}`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ucf-dictionary.csv'; a.click();
    URL.revokeObjectURL(url);
    this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('grcOs.exportDownloaded') || 'Dictionary export downloaded', life: 3000 });
  }
}
