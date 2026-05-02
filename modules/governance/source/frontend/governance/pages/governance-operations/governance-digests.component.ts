import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GovernanceApiService } from '@app/api';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { catchError, of, forkJoin } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-digests',
    imports: [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        ModuleTabsBarComponent,
        EmptyStateComponent,
        TableModule,
        TagModule,
        ButtonModule,
        SkeletonModule,
        CardModule,
        DropdownModule,
        InputNumberModule,
        ToastModule,
        TooltipModule,
        DialogModule,
    ],
    providers: [MessageService],
    template: `
    <p-toast />
    <p-dialog
      [visible]="detailVisible()"
      (visibleChange)="detailVisible.set($event)"
      [header]="detailTitle()"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(90vw, 40rem)' }"
      [contentStyle]="{ overflow: 'auto' }">
      @if (detailRecord()) {
        <pre
          class="text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200"
          >{{ detailJson() }}</pre
        >
      }
    </p-dialog>
    <div class="gov-digests-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Leadership Digests"
        titleAr="ملخصات القيادة"
        subtitleEn="Executive and operational leadership summaries"
        subtitleAr="ملخصات القيادة التنفيذية والتشغيلية"
        icon="file-text"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Digests')]"
        [isAr]="i18n.currentLang() === 'ar'"
        [dir]="dir()" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />

      @if (loading()) {
        <div class="p-4">
          <p-skeleton height="400px" borderRadius="10px" />
        </div>
      } @else if (error()) {
        <app-empty-state
          variant="error"
          [title]="i18n.translate('Failed to load digests')"
          [description]="i18n.translate('Check your connection and try again')"
          [actionLabel]="i18n.translate('Retry')"
          [dir]="dir()"
          (action)="load()" />
      } @else {
        <div class="p-4">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Total Digests') }}</div>
              <div class="text-2xl font-bold">{{ digests().length }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Executive') }}</div>
              <div class="text-2xl font-bold text-blue-600">{{ executiveCount() }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Blocked Items') }}</div>
              <div class="text-2xl font-bold text-red-600">{{ totalBlockedItems() }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Next Actions') }}</div>
              <div class="text-2xl font-bold text-purple-600">{{ totalNextActions() }}</div>
            </div>
          </div>

          <!-- Filters and Actions -->
          <div class="mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-2 flex-1 min-w-[200px]">
              <p-dropdown
                [options]="digestTypeOptions()"
                [(ngModel)]="selectedDigestTypeValue"
                [placeholder]="i18n.translate('Filter by Type')"
                [showClear]="true"
                (onChange)="onTypeFilterChange()"
                styleClass="w-48" />
            </div>
            <div class="flex gap-2">
              <p-dropdown
                [options]="digestTypeOptions()"
                [(ngModel)]="generateTypeValue"
                [placeholder]="i18n.translate('Digest Type')"
                styleClass="w-40" />
              <p-inputNumber
                [(ngModel)]="periodHoursValue"
                [min]="1"
                [max]="168"
                [showButtons]="true"
                [suffix]="' hours'"
                styleClass="w-32" />
              <p-button
                [label]="i18n.translate('Generate')"
                icon="pi pi-file"
                [outlined]="true"
                size="small"
                [loading]="generating()"
                [disabled]="!generateTypeValue"
                (onClick)="generateDigest(generateTypeValue)" />
              <p-button
                [label]="i18n.translate('Refresh')"
                icon="pi pi-refresh"
                [outlined]="true"
                size="small"
                [loading]="loading()"
                (onClick)="load()" />
            </div>
          </div>

          @if (digests().length === 0) {
            <app-empty-state
              variant="empty"
              [title]="i18n.translate('No digests found')"
              [description]="i18n.translate('Generate a digest to see leadership summaries')"
              [dir]="dir()" />
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (digest of filteredDigests(); track digest.digestId) {
                <p-card class="cursor-pointer hover:shadow-md transition-shadow" (click)="viewDetails(digest)">
                  <ng-template pTemplate="header">
                    <div class="p-3 bg-blue-50">
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="font-semibold">{{ digest.digestType }}</div>
                          <div class="text-xs text-gray-600">{{ formatDate(digest.periodEnd) }}</div>
                        </div>
                        <p-button
                          icon="pi pi-eye"
                          [text]="true"
                          [rounded]="true"
                          size="small"
                          (onClick)="viewDetails(digest); $event.stopPropagation()"
                          [pTooltip]="i18n.translate('View Details')" />
                      </div>
                    </div>
                  </ng-template>
                  <div class="p-3">
                    <div class="text-sm mb-2">
                      <strong>{{ i18n.translate('Period') }}:</strong>
                      {{ formatDate(digest.periodStart) }} - {{ formatDate(digest.periodEnd) }}
                    </div>
                    @if (digest.blockedItems && digest.blockedItems.length > 0) {
                      <div class="mb-2">
                        <p-tag
                          [value]="digest.blockedItems.length + ' blocked'"
                          severity="danger" />
                      </div>
                    }
                    @if (digest.nextBestActions && digest.nextBestActions.length > 0) {
                      <div class="text-xs text-gray-600 mt-2">
                        {{ digest.nextBestActions.length }} {{ i18n.translate('next actions') }}
                      </div>
                    }
                    @if (digest.summary) {
                      <div class="text-xs text-gray-600 mt-2 line-clamp-2">
                        {{ digest.summary }}
                      </div>
                    }
                  </div>
                </p-card>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
    styles: [`
    .gov-digests-page {
      min-height: 100vh;
      background: #f9fafb;
    }
  `]
})
export class GovernanceDigestsComponent implements OnInit {
  private api = inject(GovernanceApiService);
  private router = inject(Router);
  private msg = inject(MessageService);
  i18n = inject(I18nService);

  readonly tabs = GOVERNANCE_TABS;
  readonly dir = signal(this.i18n.direction());
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly generating = signal(false);
  readonly digests = signal<GrcRecord[]>([]);
  readonly detailVisible = signal(false);
  readonly detailRecord = signal<GrcRecord | null>(null);
  readonly detailTitle = computed(() => {
    const r = this.detailRecord();
    if (!r) return this.i18n.translate('Details');
    const type = r.digestType || r.title || '';
    const end = r.periodEnd ? this.formatDate(r.periodEnd) : '';
    return [type, end].filter(Boolean).join(' · ') || this.i18n.translate('Digest details');
  });
  readonly detailJson = computed(() => {
    const r = this.detailRecord();
    try {
      return r ? JSON.stringify(r, null, 2) : '';
    } catch {
      return String(r);
    }
  });
  readonly selectedDigestType = signal<string | null>(null);
  selectedDigestTypeValue: string | null = null;
  generateTypeValue: string = 'executive';
  periodHoursValue: number = 24;

  readonly digestTypeOptions = signal<Array<{ label: string; value: string }>>([
    { label: 'Executive', value: 'executive' },
    { label: 'Manager', value: 'manager' },
    { label: 'Committee', value: 'committee' },
    { label: 'Operational', value: 'operational' },
    { label: 'Auditor', value: 'auditor' },
    { label: 'Control Owner', value: 'control_owner' },
  ]);

  readonly filteredDigests = computed(() => {
    const all = this.digests();
    const type = this.selectedDigestType();
    if (!type) return all;
    return all.filter(d => d.digestType === type);
  });

  readonly executiveCount = computed(() => this.digests().filter(d => d.digestType === 'executive').length);
  readonly totalBlockedItems = computed(() => 
    this.digests().reduce((sum, d) => sum + (d.blockedItems?.length || 0), 0)
  );
  readonly totalNextActions = computed(() => 
    this.digests().reduce((sum, d) => sum + (d.nextBestActions?.length || 0), 0)
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.getDigests(this.selectedDigestType() || undefined).pipe(
      catchError((err) => {
        this.error.set(true);
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('Error'),
          detail: this.i18n.translate('Failed to load digests'),
        });
        return of({ digests: [] });
      })
    ).subscribe(data => {
      const digestData = (data as GrcRecord)?.digests || (Array.isArray(data) ? data : []);
      this.digests.set(digestData);
      this.loading.set(false);
    });
  }

  onTypeFilterChange(): void {
    this.selectedDigestType.set(this.selectedDigestTypeValue);
    this.load();
  }

  generateDigest(type: string): void {
    if (!type) return;
    this.generating.set(true);
    this.api.generateDigest({ type, periodHours: this.periodHoursValue || 24 } as any).pipe(
      catchError((err) => {
        this.generating.set(false);
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('Error'),
          detail: this.i18n.translate('Failed to generate digest'),
        });
        return of(null);
      })
    ).subscribe((result) => {
      this.generating.set(false);
      if (result) {
        this.msg.add({
          severity: 'success',
          summary: this.i18n.translate('Success'),
          detail: this.i18n.translate('Digest generated successfully'),
        });
        this.load();
      }
    });
  }

  viewDetails(digest: GrcRecord): void {
    this.detailRecord.set(digest ?? null);
    this.detailVisible.set(!!digest);
  }

  formatDate(date: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }
}
