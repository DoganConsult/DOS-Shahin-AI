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
import { ConfigCenterService, type ConfigAuditEntry } from './config-center.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-audit',
  standalone: true,
  imports: [
    CommonModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, SkeletonModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell
      icon="pi pi-history"
      [title]="i18n.translate('configCenter.audit')"
      [subtitle]="i18n.translate('configCenter.title')"
      [breadcrumbs]="['Admin', 'Config Center', 'Audit']"
      [loading]="loading()">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="'Refresh'"
                  (onClick)="loadAudit()" [disabled]="loading()" styleClass="p-button-outlined" />
      </div>

      @if (!loading() && entries().length === 0) {
        <div class="p-4 text-center text-color-secondary">{{ i18n.translate('configCenter.noAudit') }}</div>
      }

      <p-table [value]="entries()" [paginator]="true" [rows]="25" [rowHover]="true"
               styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="configKey">Key <p-sortIcon field="configKey" /></th>
            <th>{{ i18n.translate('configCenter.scope') }}</th>
            <th>Change</th>
            <th>Old</th>
            <th>New</th>
            <th>Actor</th>
            <th pSortableColumn="createdAt">When <p-sortIcon field="createdAt" /></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ row.configKey }}</td>
            <td><p-tag [value]="row.scope" /></td>
            <td><p-tag [value]="row.changeType" [severity]="changeTypeSeverity(row.changeType)" /></td>
            <td class="text-sm">{{ row.oldValue | json }}</td>
            <td class="text-sm">{{ row.newValue | json }}</td>
            <td>{{ row.actorId }}</td>
            <td>{{ row.createdAt | date:'short' }}</td>
          </tr>
        </ng-template>
      </p-table>
    </app-page-shell>
  `,
})
export class ConfigAuditComponent implements OnInit {
  i18n = inject(I18nService);
  private configService = inject(ConfigCenterService);
  private msg = inject(MessageService);

  loading = signal(false);
  entries = signal<ConfigAuditEntry[]>([]);

  ngOnInit() { this.loadAudit(); }

  loadAudit() {
    this.loading.set(true);
    this.configService.getAuditHistory({ limit: '100' }).subscribe({
      next: (r) => { this.entries.set(r.entries ?? []); this.loading.set(false); },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load audit history' });
        this.loading.set(false);
      },
    });
  }

  changeTypeSeverity(t: string): string {
    switch (t) {
      case 'delete': return 'danger';
      case 'import': return 'warning';
      case 'rollback': return 'warning';
      default: return 'info';
    }
  }
}
