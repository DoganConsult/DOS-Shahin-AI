import { Component, OnInit, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TabViewModule } from 'primeng/tabs';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { GrcRecord } from '@app/core/models/shared.types';
import {
  PlatformStatsService,
  PlatformOverview,
  ModuleFunctionalityEval,
  ModuleLOC,
} from '@app/core/services/platform/platform-stats.service';

@Component({
  selector: 'app-platform-stats-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TableModule,
    CardModule,
    TagModule,
    ProgressBarModule,
    TabViewModule,
    ChartModule,
    SkeletonModule,
  ],
  template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-1">Platform Statistics & Module LOC Evaluation</h2>
      <p class="text-gray-500 mb-4">Real-time codebase analysis — lines of code, module complexity, and functionality coverage</p>

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          @for (i of [1,2,3,4]; track i) {
            <p-card><p-skeleton height="80px" /></p-card>
          }
        </div>
      }

      <!-- Summary Cards -->
      @if (overview()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600">{{ overview()!.summary.totalCodeLines | number }}</div>
              <div class="text-sm text-gray-500 mt-1">Total Code Lines</div>
              <div class="text-xs text-gray-400 mt-1">{{ overview()!.summary.totalFiles | number }} files</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600">{{ overview()!.summary.backendCodeLines | number }}</div>
              <div class="text-sm text-gray-500 mt-1">Backend Code Lines</div>
              <div class="text-xs text-gray-400 mt-1">{{ overview()!.summary.backendFiles | number }} files</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-600">{{ overview()!.summary.frontendCodeLines | number }}</div>
              <div class="text-sm text-gray-500 mt-1">Frontend Code Lines</div>
              <div class="text-xs text-gray-400 mt-1">{{ overview()!.summary.frontendFiles | number }} files</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold text-orange-600">{{ overview()!.routeStats.totalManifestEntries }}</div>
              <div class="text-sm text-gray-500 mt-1">API Route Entries</div>
              <div class="text-xs text-gray-400 mt-1">{{ overview()!.routeStats.totalRouteFiles }} route files</div>
            </div>
          </p-card>
        </div>

        <!-- Secondary Stats Row -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div class="bg-white rounded-lg border p-3 text-center">
            <div class="text-xl font-semibold">{{ overview()!.serviceStats.totalServices }}</div>
            <div class="text-xs text-gray-500">Services</div>
          </div>
          <div class="bg-white rounded-lg border p-3 text-center">
            <div class="text-xl font-semibold">{{ overview()!.serviceStats.totalMiddleware }}</div>
            <div class="text-xs text-gray-500">Middleware</div>
          </div>
          <div class="bg-white rounded-lg border p-3 text-center">
            <div class="text-xl font-semibold">{{ overview()!.frontendStats.totalComponents }}</div>
            <div class="text-xs text-gray-500">Components</div>
          </div>
          <div class="bg-white rounded-lg border p-3 text-center">
            <div class="text-xl font-semibold">{{ overview()!.frontendStats.totalFeatures }}</div>
            <div class="text-xs text-gray-500">Feature Modules</div>
          </div>
          <div class="bg-white rounded-lg border p-3 text-center">
            <div class="text-xl font-semibold">{{ overview()!.frontendStats.totalPages }}</div>
            <div class="text-xs text-gray-500">Pages</div>
          </div>
          <div class="bg-white rounded-lg border p-3 text-center">
            <div class="text-xl font-semibold">{{ overview()!.serviceStats.totalMigrations }}</div>
            <div class="text-xs text-gray-500">Migrations</div>
          </div>
        </div>

        <p-tabView>
          <!-- Tab 1: Module Functionality Evaluation -->
          <p-tabPanel header="Module Functionality">
            @if (moduleEvals().length > 0) {
              <p-table [value]="moduleEvals()" [paginator]="true" [rows]="20" styleClass="p-datatable-sm"
                       [globalFilterFields]="['module', 'category']" sortField="functionalityScore" [sortOrder]="-1">
                <ng-template pTemplate="header">
                  <tr>
                    <th pSortableColumn="module">Module <p-sortIcon field="module" /></th>
                    <th pSortableColumn="category">Category <p-sortIcon field="category" /></th>
                    <th pSortableColumn="functionalityScore">Score <p-sortIcon field="functionalityScore" /></th>
                    <th pSortableColumn="metrics.codeLines">Code Lines <p-sortIcon field="metrics.codeLines" /></th>
                    <th>Files</th>
                    <th>Routes</th>
                    <th>Services</th>
                    <th>Complexity</th>
                    <th>Coverage</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-mod>
                  <tr>
                    <td class="font-semibold">{{ mod.module }}</td>
                    <td><p-tag [value]="mod.category" [severity]="getCategorySeverity(mod.category)" /></td>
                    <td>
                      <div class="flex items-center gap-2">
                        <p-progressBar [value]="mod.functionalityScore" [showValue]="false"
                                       [style]="{ width: '80px', height: '8px' }"
                                       [ngClass]="getScoreClass(mod.functionalityScore)" />
                        <span class="text-sm font-medium">{{ mod.functionalityScore }}%</span>
                      </div>
                    </td>
                    <td>{{ mod.metrics.codeLines | number }}</td>
                    <td>{{ mod.metrics.fileCount }}</td>
                    <td>{{ mod.metrics.routeCount }}</td>
                    <td>{{ mod.metrics.serviceCount }}</td>
                    <td><p-tag [value]="mod.metrics.complexity" [severity]="getComplexitySeverity(mod.metrics.complexity)" /></td>
                    <td>
                      <div class="flex gap-1">
                        @if (mod.metrics.hasRoutes) { <span class="text-xs bg-blue-100 text-blue-700 px-1 rounded">R</span> }
                        @if (mod.metrics.hasServices) { <span class="text-xs bg-green-100 text-green-700 px-1 rounded">S</span> }
                        @if (mod.metrics.hasTests) { <span class="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">T</span> }
                        @if (mod.metrics.hasTypes) { <span class="text-xs bg-purple-100 text-purple-700 px-1 rounded">I</span> }
                        @if (mod.metrics.hasMigrations) { <span class="text-xs bg-orange-100 text-orange-700 px-1 rounded">M</span> }
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
              <div class="mt-2 text-xs text-gray-400">R = Routes, S = Services, T = Tests, I = Interfaces/Types, M = Migrations</div>
            }
          </p-tabPanel>

          <!-- Tab 2: Backend Modules LOC -->
          <p-tabPanel header="Backend LOC">
            <p-table [value]="overview()!.backendModules" [paginator]="true" [rows]="20" styleClass="p-datatable-sm"
                     sortField="codeLines" [sortOrder]="-1">
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="module">Module <p-sortIcon field="module" /></th>
                  <th>Description</th>
                  <th pSortableColumn="codeLines">Code Lines <p-sortIcon field="codeLines" /></th>
                  <th pSortableColumn="totalFiles">Files <p-sortIcon field="totalFiles" /></th>
                  <th>Comments</th>
                  <th>Blank</th>
                  <th>Top Files</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-mod>
                <tr>
                  <td class="font-semibold">{{ mod.module }}</td>
                  <td class="text-gray-500 text-sm">{{ mod.description }}</td>
                  <td class="font-medium">{{ mod.codeLines | number }}</td>
                  <td>{{ mod.totalFiles }}</td>
                  <td class="text-gray-400">{{ mod.commentLines | number }}</td>
                  <td class="text-gray-400">{{ mod.blankLines | number }}</td>
                  <td>
                    <div class="text-xs text-gray-500">
                      @for (f of mod.topFiles.slice(0, 3); track f.file) {
                        <div>{{ f.file }} ({{ f.codeLines }})</div>
                      }
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- Tab 3: Frontend Modules LOC -->
          <p-tabPanel header="Frontend LOC">
            <p-table [value]="overview()!.frontendModules" [paginator]="true" [rows]="20" styleClass="p-datatable-sm"
                     sortField="codeLines" [sortOrder]="-1">
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="module">Module <p-sortIcon field="module" /></th>
                  <th>Description</th>
                  <th pSortableColumn="codeLines">Code Lines <p-sortIcon field="codeLines" /></th>
                  <th pSortableColumn="totalFiles">Files <p-sortIcon field="totalFiles" /></th>
                  <th>Comments</th>
                  <th>Top Files</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-mod>
                <tr>
                  <td class="font-semibold">{{ mod.module }}</td>
                  <td class="text-gray-500 text-sm">{{ mod.description }}</td>
                  <td class="font-medium">{{ mod.codeLines | number }}</td>
                  <td>{{ mod.totalFiles }}</td>
                  <td class="text-gray-400">{{ mod.commentLines | number }}</td>
                  <td>
                    <div class="text-xs text-gray-500">
                      @for (f of mod.topFiles.slice(0, 3); track f.file) {
                        <div>{{ f.file }} ({{ f.codeLines }})</div>
                      }
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- Tab 4: Language Breakdown -->
          <p-tabPanel header="Languages">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <p-table [value]="languageRows()" styleClass="p-datatable-sm" sortField="codeLines" [sortOrder]="-1">
                <ng-template pTemplate="header">
                  <tr>
                    <th pSortableColumn="ext">Extension <p-sortIcon field="ext" /></th>
                    <th pSortableColumn="files">Files <p-sortIcon field="files" /></th>
                    <th pSortableColumn="codeLines">Code Lines <p-sortIcon field="codeLines" /></th>
                    <th>% of Total</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr>
                    <td class="font-medium">{{ row.ext }}</td>
                    <td>{{ row.files | number }}</td>
                    <td>{{ row.codeLines | number }}</td>
                    <td>
                      <p-progressBar [value]="row.pct" [showValue]="true"
                                     [style]="{ height: '16px' }" />
                    </td>
                  </tr>
                </ng-template>
              </p-table>

              @if (languageChart()) {
                <div>
                  <p-chart type="doughnut" [data]="languageChart()!" [options]="chartOptions" height="350px" />
                </div>
              }
            </div>
          </p-tabPanel>
        </p-tabView>

        <div class="mt-4 text-xs text-gray-400 text-right">
          Computed at {{ overview()!.computedAt | date:'medium' }}
        </div>
      }
    </div>
  `,
})
export class PlatformStatsPageComponent implements OnInit {
  private statsService = inject(PlatformStatsService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  overview = signal<PlatformOverview | null>(null);
  moduleEvals = signal<ModuleFunctionalityEval[]>([]);
  languageRows = signal<{ ext: string; files: number; codeLines: number; pct: number }[]>([]);
  languageChart = signal<GrcRecord | null>(null);

  chartOptions = {
    plugins: {
      legend: { position: 'right' as const },
    },
  };

  ngOnInit(): void {
    this.statsService.getOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.overview.set(data);
          this.buildLanguageData(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    this.statsService.getModuleEvaluation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.moduleEvals.set(data.modules),
      });
  }

  private buildLanguageData(data: PlatformOverview): void {
    const total = data.summary.totalCodeLines || 1;
    const rows = Object.entries(data.languages)
      .map(([ext, v]) => ({
        ext,
        files: v.files,
        codeLines: v.codeLines,
        pct: Math.round((v.codeLines / total) * 100),
      }))
      .sort((a, b) => b.codeLines - a.codeLines);
    this.languageRows.set(rows);

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#64748B'];
    this.languageChart.set({
      labels: rows.slice(0, 10).map(r => r.ext),
      datasets: [{
        data: rows.slice(0, 10).map(r => r.codeLines),
        backgroundColor: colors.slice(0, rows.length),
      }],
    });
  }

  getCategorySeverity(cat: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
    const map: Record<string, unknown> = {
      'Core GRC': 'info', 'AI/ML': 'warn', 'Third-Party': 'secondary',
      'Reporting': 'success', 'Automation': 'contrast', 'Organization': 'info',
    };
    return map[cat] || 'info';
  }

  getComplexitySeverity(c: string): "success" | "info" | "warn" | "danger" | undefined {
    const map: Record<string, unknown> = {
      'low': 'success', 'medium': 'info', 'high': 'warn', 'very-high': 'danger',
    };
    return map[c] || 'info';
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  }
}
