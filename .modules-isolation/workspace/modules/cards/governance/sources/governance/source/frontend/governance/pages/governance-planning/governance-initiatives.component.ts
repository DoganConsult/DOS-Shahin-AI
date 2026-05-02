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
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { catchError, of, forkJoin } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-initiatives',
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
        DropdownModule,
        InputTextModule,
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
    <div class="gov-initiatives-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Leadership Initiatives"
        titleAr="مبادرات القيادة"
        subtitleEn="Active initiatives and their execution status"
        subtitleAr="المبادرات النشطة وحالة تنفيذها"
        icon="rocket"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Initiatives')]"
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
          [title]="i18n.translate('Failed to load initiatives')"
          [description]="i18n.translate('Check your connection and try again')"
          [actionLabel]="i18n.translate('Retry')"
          [dir]="dir()"
          (action)="load()" />
      } @else {
        <div class="p-4">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Total Initiatives') }}</div>
              <div class="text-2xl font-bold">{{ initiatives().length }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Active') }}</div>
              <div class="text-2xl font-bold text-green-600">{{ activeCount() }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Scheduled') }}</div>
              <div class="text-2xl font-bold text-blue-600">{{ scheduledCount() }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Recent Runs') }}</div>
              <div class="text-2xl font-bold text-purple-600">{{ recentRunsCount() }}</div>
            </div>
          </div>

          <!-- Filters and Actions -->
          <div class="mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-2 flex-1 min-w-[200px]">
              <p-dropdown
                [options]="moduleOptions()"
                [(ngModel)]="selectedModuleValue"
                [placeholder]="i18n.translate('Filter by Module')"
                [showClear]="true"
                (onChange)="onModuleFilterChange()"
                styleClass="w-48" />
              <input
                pInputText
                [(ngModel)]="searchTextValue"
                [placeholder]="i18n.translate('Search initiatives...')"
                (input)="onSearch()"
                class="flex-1 max-w-xs" />
            </div>
            <div class="flex gap-2">
              <p-button
                [label]="i18n.translate('Run Orchestrator')"
                icon="pi pi-play"
                [outlined]="true"
                size="small"
                [loading]="runningOrchestrator()"
                (onClick)="runOrchestrator()" />
              <p-button
                [label]="i18n.translate('Refresh')"
                icon="pi pi-refresh"
                [outlined]="true"
                size="small"
                [loading]="loading()"
                (onClick)="load()" />
            </div>
          </div>

          @if (initiatives().length === 0) {
            <app-empty-state
              variant="empty"
              [title]="i18n.translate('No initiatives found')"
              [description]="i18n.translate('No active initiatives at this time')"
              [dir]="dir()" />
          } @else {
            <p-table
              [value]="filteredInitiatives()"
              [paginator]="true"
              [rows]="20"
              [showCurrentPageReport]="true"
              [sortMode]="'single'"
              styleClass="p-datatable-sm"
              [rowHover]="true">
              <ng-template pTemplate="header">
                <tr>
                  <th [pSortableColumn]="'initiativeName'">
                    {{ i18n.translate('Initiative') }}
                    <p-sortIcon field="initiativeName" />
                  </th>
                  <th [pSortableColumn]="'moduleCode'">
                    {{ i18n.translate('Module') }}
                    <p-sortIcon field="moduleCode" />
                  </th>
                  <th [pSortableColumn]="'isActive'">
                    {{ i18n.translate('Status') }}
                    <p-sortIcon field="isActive" />
                  </th>
                  <th [pSortableColumn]="'autonomyLevel'">
                    {{ i18n.translate('Autonomy') }}
                    <p-sortIcon field="autonomyLevel" />
                  </th>
                  <th>{{ i18n.translate('Schedule') }}</th>
                  <th>{{ i18n.translate('Last Run') }}</th>
                  <th>{{ i18n.translate('Actions') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-initiative>
                <tr class="cursor-pointer" (click)="viewDetails(initiative)">
                  <td>
                    <div class="font-medium">{{ initiative.initiativeName }}</div>
                    <div class="text-xs text-gray-500">{{ initiative.purpose }}</div>
                  </td>
                  <td>
                    <p-tag [value]="initiative.moduleCode" severity="info" />
                  </td>
                  <td>
                    <p-tag
                      [value]="initiative.isActive ? 'Active' : 'Inactive'"
                      [severity]="initiative.isActive ? 'success' : 'secondary'" />
                  </td>
                  <td>
                    <span class="text-sm">Level {{ initiative.autonomyLevel }}</span>
                    @if (initiative.approvalRequired) {
                      <p-tag value="Approval" severity="warning" styleClass="ml-1" />
                    }
                  </td>
                  <td>
                    @if (initiative.scheduleCron) {
                      <span class="text-xs text-blue-600">{{ initiative.scheduleCron }}</span>
                    } @else {
                      <span class="text-xs text-gray-400">{{ i18n.translate('Manual') }}</span>
                    }
                  </td>
                  <td>
                    <span class="text-sm text-gray-600">{{ getLastRunTime(initiative.initiativeCode) }}</span>
                  </td>
                  <td>
                    <p-button
                      icon="pi pi-eye"
                      [text]="true"
                      [rounded]="true"
                      size="small"
                      (onClick)="viewDetails(initiative); $event.stopPropagation()"
                      [pTooltip]="i18n.translate('View Details')" />
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </div>
      }
    </div>
  `,
    styles: [`
    .gov-initiatives-page {
      min-height: 100vh;
      background: #f9fafb;
    }
  `]
})
export class GovernanceInitiativesComponent implements OnInit {
  private api = inject(GovernanceApiService);
  private router = inject(Router);
  private msg = inject(MessageService);
  i18n = inject(I18nService);

  readonly tabs = GOVERNANCE_TABS;
  readonly dir = signal(this.i18n.direction());
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly runningOrchestrator = signal(false);
  readonly initiatives = signal<GrcRecord[]>([]);
  readonly detailVisible = signal(false);
  readonly detailRecord = signal<GrcRecord | null>(null);
  readonly detailTitle = computed(() => {
    const r = this.detailRecord();
    if (!r) return this.i18n.translate('Details');
    return (
      r.initiativeName ||
      r.initiativeCode ||
      r.title ||
      this.i18n.translate('Initiative details')
    );
  });
  readonly detailJson = computed(() => {
    const r = this.detailRecord();
    try {
      return r ? JSON.stringify(r, null, 2) : '';
    } catch {
      return String(r);
    }
  });
  readonly recentRuns = signal<GrcRecord[]>([]);
  readonly selectedModule = signal<string | null>(null);
  readonly searchText = signal('');
  selectedModuleValue: string | null = null;
  searchTextValue: string = '';

  readonly moduleOptions = signal<Array<{ label: string; value: string }>>([]);

  readonly filteredInitiatives = computed(() => {
    const all = this.initiatives();
    const module = this.selectedModule();
    const text = this.searchText().toLowerCase();
    
    let filtered = all;
    if (module) {
      filtered = filtered.filter(i => i.moduleCode === module);
    }
    if (text) {
      filtered = filtered.filter(i => 
        i.initiativeName?.toLowerCase().includes(text) ||
        i.purpose?.toLowerCase().includes(text) ||
        i.initiativeCode?.toLowerCase().includes(text)
      );
    }
    return filtered;
  });

  readonly activeCount = computed(() => this.initiatives().filter((i) => i.isActive).length);
  readonly scheduledCount = computed(() => this.initiatives().filter((i) => i.scheduleCron).length);
  readonly recentRunsCount = computed(() => this.recentRuns().length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      initiatives: this.api.getInitiatives(this.selectedModule() || undefined),
      runs: this.api.getOrchestratorRuns(this.selectedModule() || undefined),
    }).pipe(
      catchError((err) => {
        this.error.set(true);
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('Error'),
          detail: this.i18n.translate('Failed to load initiatives'),
        });
        return of({ initiatives: { initiatives: [] }, runs: { runs: [] } });
      })
    ).subscribe(({ initiatives, runs }) => {
      const initData = (initiatives as GrcRecord)?.initiatives || (Array.isArray(initiatives) ? initiatives : []);
      const runsData = (runs as GrcRecord)?.runs || (Array.isArray(runs) ? runs : []);
      this.initiatives.set(initData);
      this.recentRuns.set(runsData);
      
      // Build module options from loaded initiatives
      const modules = [...new Set(initData.map((i) => i.moduleCode))].sort();
      this.moduleOptions.set(modules.map(m => ({ label: String(m), value: String(m) })));
      
      this.loading.set(false);
    });
  }

  onModuleFilterChange(): void {
    this.selectedModule.set(this.selectedModuleValue);
    this.load();
  }

  onSearch(): void {
    this.searchText.set(this.searchTextValue);
  }

  getLastRunTime(initiativeCode: string): string {
    const run = this.recentRuns().find((r) => r.initiativeCode === initiativeCode);
    if (!run || !run.startedAt) return '-';
    const date = new Date(run.startedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return this.i18n.translate('Just now');
    if (diffMins < 60) return `${diffMins}m ${this.i18n.translate('ago')}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${this.i18n.translate('ago')}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${this.i18n.translate('ago')}`;
  }

  runOrchestrator(): void {
    this.runningOrchestrator.set(true);
    this.api.runOrchestrator(this.selectedModule() ? { module: this.selectedModule() } : undefined).pipe(
      catchError((err) => {
        this.runningOrchestrator.set(false);
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('Error'),
          detail: this.i18n.translate('Failed to run orchestrator'),
        });
        return of(null);
      })
    ).subscribe((result) => {
      this.runningOrchestrator.set(false);
      if (result) {
        this.msg.add({
          severity: 'success',
          summary: this.i18n.translate('Success'),
          detail: this.i18n.translate('Orchestrator run completed'),
        });
        this.load();
      }
    });
  }

  viewDetails(initiative: GrcRecord): void {
    this.detailRecord.set(initiative ?? null);
    this.detailVisible.set(!!initiative);
  }

  formatDate(date: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }
}
