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
    selector: 'app-governance-milestones',
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
    <div class="gov-milestones-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Milestones"
        titleAr="المعالم"
        subtitleEn="Track progress across GRC milestones"
        subtitleAr="تتبع التقدم عبر معالم GRC"
        icon="flag"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Milestones')]"
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
          [title]="i18n.translate('Failed to load milestones')"
          [description]="i18n.translate('Check your connection and try again')"
          [actionLabel]="i18n.translate('Retry')"
          [dir]="dir()"
          (action)="load()" />
      } @else {
        <div class="p-4">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Total Milestones') }}</div>
              <div class="text-2xl font-bold">{{ milestones().length }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Completed') }}</div>
              <div class="text-2xl font-bold text-green-600">{{ completedCount() }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('Blocked') }}</div>
              <div class="text-2xl font-bold text-red-600">{{ blockedCount() }}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-600 mb-1">{{ i18n.translate('At Risk') }}</div>
              <div class="text-2xl font-bold text-yellow-600">{{ atRiskCount() }}</div>
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
              <p-dropdown
                [options]="stateOptions()"
                [(ngModel)]="selectedStateValue"
                [placeholder]="i18n.translate('Filter by State')"
                [showClear]="true"
                (onChange)="onStateFilterChange()"
                styleClass="w-48" />
            </div>
            <div class="flex gap-2">
              <p-button
                [label]="i18n.translate('Evaluate Live')"
                icon="pi pi-sync"
                [outlined]="true"
                size="small"
                [loading]="evaluating()"
                (onClick)="evaluateLive()" />
              <p-button
                [label]="i18n.translate('Refresh')"
                icon="pi pi-refresh"
                [outlined]="true"
                size="small"
                [loading]="loading()"
                (onClick)="load()" />
            </div>
          </div>

          @if (milestones().length === 0) {
            <app-empty-state
              variant="empty"
              [title]="i18n.translate('No milestones found')"
              [description]="i18n.translate('No milestone instances at this time')"
              [dir]="dir()" />
          } @else {
            <p-table
              [value]="filteredMilestones()"
              [paginator]="true"
              [rows]="20"
              [showCurrentPageReport]="true"
              [sortMode]="'single'"
              styleClass="p-datatable-sm"
              [rowHover]="true">
              <ng-template pTemplate="header">
                <tr>
                  <th [pSortableColumn]="'milestoneCode'">
                    {{ i18n.translate('Milestone') }}
                    <p-sortIcon field="milestoneCode" />
                  </th>
                  <th [pSortableColumn]="'moduleCode'">
                    {{ i18n.translate('Module') }}
                    <p-sortIcon field="moduleCode" />
                  </th>
                  <th [pSortableColumn]="'state'">
                    {{ i18n.translate('State') }}
                    <p-sortIcon field="state" />
                  </th>
                  <th [pSortableColumn]="'health'">
                    {{ i18n.translate('Health') }}
                    <p-sortIcon field="health" />
                  </th>
                  <th [pSortableColumn]="'progressPct'">
                    {{ i18n.translate('Progress') }}
                    <p-sortIcon field="progressPct" />
                  </th>
                  <th>{{ i18n.translate('Actions') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-milestone>
                <tr class="cursor-pointer" (click)="viewDetails(milestone)">
                  <td>
                    <div class="font-medium">{{ milestone.milestoneCode }}</div>
                    <div class="text-xs text-gray-500">{{ milestone.milestoneName || milestone.milestoneCode }}</div>
                  </td>
                  <td>
                    <p-tag [value]="milestone.moduleCode" severity="info" />
                  </td>
                  <td>
                    <p-tag
                      [value]="milestone.state"
                      [severity]="getStateSeverity(milestone.state)" />
                  </td>
                  <td>
                    <p-tag
                      [value]="milestone.health || 'any'"
                      [severity]="getHealthSeverity(milestone.health)" />
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          class="h-2 rounded-full"
                          [class.bg-green-500]="(milestone.progressPct || milestone.progress || 0) >= 100"
                          [class.bg-blue-500]="(milestone.progressPct || milestone.progress || 0) >= 50 && (milestone.progressPct || milestone.progress || 0) < 100"
                          [class.bg-yellow-500]="(milestone.progressPct || milestone.progress || 0) > 0 && (milestone.progressPct || milestone.progress || 0) < 50"
                          [class.bg-gray-400]="(milestone.progressPct || milestone.progress || 0) === 0"
                          [style.width.%]="milestone.progressPct || milestone.progress || 0">
                        </div>
                      </div>
                      <span class="text-sm">{{ milestone.progressPct || milestone.progress || 0 }}%</span>
                    </div>
                  </td>
                  <td>
                    <p-button
                      icon="pi pi-eye"
                      [text]="true"
                      [rounded]="true"
                      size="small"
                      (onClick)="viewDetails(milestone); $event.stopPropagation()"
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
    .gov-milestones-page {
      min-height: 100vh;
      background: #f9fafb;
    }
  `]
})
export class GovernanceMilestonesComponent implements OnInit {
  private api = inject(GovernanceApiService);
  private router = inject(Router);
  private msg = inject(MessageService);
  i18n = inject(I18nService);

  readonly tabs = GOVERNANCE_TABS;
  readonly dir = signal(this.i18n.direction());
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly evaluating = signal(false);
  readonly milestones = signal<GrcRecord[]>([]);
  readonly detailVisible = signal(false);
  readonly detailRecord = signal<GrcRecord | null>(null);
  readonly detailTitle = computed(() => {
    const r = this.detailRecord();
    if (!r) return this.i18n.translate('Details');
    return (
      r.milestoneName ||
      r.milestoneCode ||
      r.title ||
      this.i18n.translate('Milestone details')
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
  readonly selectedModule = signal<string | null>(null);
  readonly selectedState = signal<string | null>(null);
  selectedModuleValue: string | null = null;
  selectedStateValue: string | null = null;

  readonly moduleOptions = signal<Array<{ label: string; value: string }>>([]);
  readonly stateOptions = signal<Array<{ label: string; value: string }>>([
    { label: 'Completed', value: 'completed' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Blocked', value: 'blocked' },
    { label: 'Not Started', value: 'not_started' },
    { label: 'Regressed', value: 'regressed' },
  ]);

  readonly filteredMilestones = computed(() => {
    const all = this.milestones();
    const module = this.selectedModule();
    const state = this.selectedState();
    
    let filtered = all;
    if (module) {
      filtered = filtered.filter(m => m.moduleCode === module);
    }
    if (state) {
      filtered = filtered.filter(m => m.state === state);
    }
    return filtered;
  });

  readonly completedCount = computed(() => this.milestones().filter(m => m.state === 'completed').length);
  readonly blockedCount = computed(() => this.milestones().filter(m => m.state === 'blocked').length);
  readonly atRiskCount = computed(() => this.milestones().filter(m => m.health === 'at_risk').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      milestones: this.api.getMilestoneInstances(this.selectedModule() || undefined),
      rollup: this.api.getMilestoneRollupByModule(),
    }).pipe(
      catchError((err) => {
        this.error.set(true);
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('Error'),
          detail: this.i18n.translate('Failed to load milestones'),
        });
        return of({ milestones: { instances: [] }, rollup: {} });
      })
    ).subscribe(({ milestones, rollup }) => {
      const milestoneData = (milestones as GrcRecord)?.instances || (Array.isArray(milestones) ? milestones : []);
      this.milestones.set(milestoneData);
      
      // Build module options from loaded milestones
      const modules = [...new Set(milestoneData.map((m) => m.moduleCode))].sort();
      this.moduleOptions.set(modules.map(m => ({ label: String(m), value: String(m) })));
      
      this.loading.set(false);
    });
  }

  onModuleFilterChange(): void {
    this.selectedModule.set(this.selectedModuleValue);
    this.load();
  }

  onStateFilterChange(): void {
    this.selectedState.set(this.selectedStateValue);
  }

  evaluateLive(): void {
    this.evaluating.set(true);
    this.api.evaluateMilestonesLive(this.selectedModule() || undefined).pipe(
      catchError((err) => {
        this.evaluating.set(false);
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('Error'),
          detail: this.i18n.translate('Failed to evaluate milestones'),
        });
        return of(null);
      })
    ).subscribe((result) => {
      this.evaluating.set(false);
      if (result) {
        const changed = (result as GrcRecord)?.totalChanged || 0;
        this.msg.add({
          severity: 'success',
          summary: this.i18n.translate('Success'),
          detail: this.i18n.translate('Evaluated {{count}} milestones, {{changed}} changed', { count: (result as GrcRecord)?.totalEvaluated || 0, changed }),
        });
        this.load();
      }
    });
  }

  viewDetails(milestone: GrcRecord): void {
    this.detailRecord.set(milestone ?? null);
    this.detailVisible.set(!!milestone);
  }

  getStateSeverity(state: string): string {
    const map: Record<string, string> = {
      completed: 'success',
      in_progress: 'info',
      blocked: 'danger',
      not_started: 'secondary',
      regressed: 'warning',
    };
    return map[state] || 'secondary';
  }

  getHealthSeverity(health: string): string {
    const map: Record<string, string> = {
      healthy: 'success',
      at_risk: 'warning',
      blocked: 'danger',
      any: 'secondary',
    };
    return map[health] || 'secondary';
  }
}
