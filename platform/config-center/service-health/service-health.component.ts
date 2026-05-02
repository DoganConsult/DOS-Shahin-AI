import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-service-health',
    imports: [CommonModule, RouterModule, PageShellComponent],
    template: `
    <app-page-shell icon="heart" [title]="i18n.translate('serviceHealth.title')" [subtitle]="i18n.translate('serviceHealth.subtitle')" [breadcrumbs]="['Admin', 'Service Health']" [loading]="loading">
      <div class="entity-page" *ngIf="!loading">
        <div class="entity-grid" *ngIf="rows.length > 0">
          <div *ngFor="let row of rows" class="entity-card">
            <div class="entity-card-header">
              <i class="pi" [ngClass]="row.status === 'healthy' ? 'pi-check-circle' : 'pi-exclamation-triangle'" [style.color]="row.status === 'healthy' ? 'var(--green-500)' : 'var(--red-500)'"></i>
              <span class="entity-title">{{ row.name || row.service || row.id }}</span>
            </div>
            <div class="entity-meta">{{ row.status }} · {{ row.latency || row.responseTime || '—' }}</div>
          </div>
        </div>
        <div class="entity-empty" *ngIf="rows.length === 0">
          <i class="pi pi-check-circle" style="color:var(--green-500)"></i>
          <p>{{ i18n.translate('serviceHealth.allOperational') }}</p>
        </div>
      </div>
    </app-page-shell>
  `
})
export class ServiceHealthComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  rows: Record<string, unknown>[] = [];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.apiclientSvc.get('/service-health').subscribe({
      next: (res: Record<string, unknown>) => { this.rows = Array.isArray(res) ? res : res?.services || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.rows = []; this.loading = false; this.cdr.markForCheck(); },
    });
  }

}
