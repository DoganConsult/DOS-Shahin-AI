import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, ButtonModule, DropdownModule],
  template: `
    <app-page-shell icon="clock" [title]="i18n.translate('timeline.title')" [subtitle]="'Activity feed across all GRC modules'" [breadcrumbs]="['Dashboard', 'Timeline']" [loading]="loading">
      <div class="flex gap-3 mb-4">
        <p-dropdown [options]="moduleOptions" [(ngModel)]="selectedModule" (onChange)="loadTimeline()" placeholder="All Modules" [style]="{'min-width':'200px'}"></p-dropdown>
      </div>
      <div class="flex flex-column gap-3">
        <p-card *ngFor="let item of timeline" [style]="{'border-inline-start': '4px solid ' + getActionColor(item.action)}">
          <div class="flex justify-content-between align-items-center">
            <div>
              <span class="font-semibold">{{item.summary || item.action + ' ' + item.entityType}}</span>
              <div class="text-sm text-color-secondary mt-1">
                <i class="pi pi-user mr-1"></i>{{item.userId}} · <i class="pi pi-clock mr-1"></i>{{item.timestamp | appDate:'medium'}} · <span class="text-primary">{{item.module}}</span>
              </div>
            </div>
            <span class="p-tag" [ngClass]="{'p-tag-success': item.action==='create', 'p-tag-warning': item.action==='update', 'p-tag-danger': item.action==='delete'}">{{item.action}}</span>
          </div>
        </p-card>
        <div *ngIf="timeline.length === 0 && !loading" class="text-center text-color-secondary p-5">{{i18n.translate('timeline.noActivity')}}</div>
        <button *ngIf="hasMore" pButton [label]="i18n.translate('timeline.loadMore')" class="p-button-outlined" (click)="loadMore()"></button>
      </div>
    </app-page-shell>
  `
})
export class TimelineComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  timeline: Record<string, unknown>[] = [];
  loading = true;
  selectedModule = '';
  hasMore = false;
  offset = 0;
  moduleOptions = [
    { label: 'All Modules', value: '' },
    { label: 'Risks', value: 'risks' }, { label: 'Policies', value: 'policies' },
    { label: 'Controls', value: 'controls' }, { label: 'Incidents', value: 'incidents' },
    { label: 'Vendors', value: 'vendors' }, { label: 'Evidence', value: 'evidence' },
    { label: 'Assessments', value: 'assessments' }, { label: 'Workflows', value: 'workflows' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.loadTimeline(); }

  loadTimeline() {
    this.offset = 0;
    this.loading = true;
    const qs = new URLSearchParams({ limit: '50', offset: '0' });
    if (this.selectedModule) qs.set('module', this.selectedModule);
    this.apiclientSvc.get(`/timeline?${qs}`).subscribe({
      next: (data: any) => { this.timeline = data; this.hasMore = data.length === 50; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadMore() {
    this.offset += 50;
    const qs = new URLSearchParams({ limit: '50', offset: String(this.offset) });
    if (this.selectedModule) qs.set('module', this.selectedModule);
    this.apiclientSvc.get(`/timeline?${qs}`).subscribe({
      next: (data: any) => { this.timeline = [...this.timeline, ...data]; this.hasMore = data.length === 50; }
    });
  }

  getActionColor(action: string): string {
    return action === 'create' ? 'var(--success)' : action === 'update' ? 'var(--warning)' : 'var(--error)';
  }

}
