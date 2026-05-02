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
import { ConfigCenterService, type ConfigDiff } from './config-center.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-compare',
  standalone: true,
  imports: [
    CommonModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, SkeletonModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell
      icon="pi pi-arrows-h"
      [title]="i18n.translate('configCenter.compare')"
      [subtitle]="i18n.translate('configCenter.title')"
      [breadcrumbs]="['Admin', 'Config Center', 'Compare']"
      [loading]="loading()">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="'Compare to Defaults'" (onClick)="loadDefaults()" [disabled]="loading()" styleClass="p-button-outlined" />
      </div>

      @if (!loading() && diffs().length === 0) {
        <div class="p-4 text-center text-color-secondary">{{ i18n.translate('configCenter.noData') }}</div>
      }

      @if (diffs().length > 0) {
        <div class="mb-3">
          <p-tag value="Total" severity="info" /> {{ diffs().length }}
          <p-tag value="Mismatches" severity="warning" style="margin-inline-start:0.5rem" /> {{ diffs().filter(d => !d.match).length }}
        </div>
      }

      <p-table [value]="diffs()" [paginator]="true" [rows]="25" [rowHover]="true"
               styleClass="p-datatable-sm p-datatable-striped"
               [globalFilterFields]="['key']">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="key">Key <p-sortIcon field="key" /></th>
            <th>{{ i18n.translate('configCenter.scope') }}</th>
            <th>Tenant Value</th>
            <th>Default Value</th>
            <th>Match</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [class.bg-red-50]="!row.match">
            <td>{{ row.key }}</td>
            <td><p-tag [value]="row.scope" /></td>
            <td class="text-sm">{{ row.valueA | json }}</td>
            <td class="text-sm">{{ row.valueB | json }}</td>
            <td><p-tag [value]="row.match ? 'Match' : 'Mismatch'" [severity]="row.match ? 'success' : 'danger'" /></td>
          </tr>
        </ng-template>
      </p-table>
    </app-page-shell>
  `,
})
export class ConfigCompareComponent implements OnInit {
  i18n = inject(I18nService);
  private configService = inject(ConfigCenterService);
  private msg = inject(MessageService);

  loading = signal(false);
  diffs = signal<ConfigDiff[]>([]);

  ngOnInit() { this.loadDefaults(); }

  loadDefaults() {
    this.loading.set(true);
    this.configService.compareToDefaults().subscribe({
      next: (r) => { this.diffs.set(r.diffs ?? []); this.loading.set(false); },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load config comparison' });
        this.loading.set(false);
      },
    });
  }
}
