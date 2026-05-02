import { Component, inject, signal, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  WorkspaceAuditApiService,
  WorkspaceAuditReport,
  AuditHistoryEntry,
  ComponentTrackingResult,
} from './services/workspace-audit-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workspace-audit-page',
    imports: [CommonModule],
    template: `
    <div class="p-6 max-w-[1400px] mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Workspace Audit Tracker</h1>
          <p class="text-sm text-gray-500 mt-1">
            Secure 10-min auto-scan — git tracking, code quality, component health
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span *ngIf="report()" class="text-xs text-gray-400">
            Last scan: {{ report()!.timestamp | date:'medium' }}
            &middot; {{ report()!.durationMs }}ms
          </span>
          <button
            class="rounded-lg px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
            (click)="runNow()"
            [disabled]="loading()">
            {{ loading() ? 'Scanning...' : 'Run Now' }}
          </button>
        </div>
      </div>

      <!-- Status Banner -->
      <div *ngIf="report()" class="rounded-2xl p-4 flex items-center gap-4"
        [class]="statusBannerClass()">
        <div class="text-3xl">{{ statusIcon() }}</div>
        <div>
          <div class="font-semibold text-lg">{{ report()!.status | uppercase }}</div>
          <div class="text-sm opacity-80">
            Branch: <span class="font-mono">{{ report()!.git.branch }}</span>
            &middot; Trend: {{ report()!.trend }}
            &middot; {{ report()!.alerts.length }} alert(s)
          </div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div *ngIf="report()" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div class="border rounded-xl bg-white p-4 text-center">
          <div class="text-xs text-gray-500 mb-1">Total Uncommitted</div>
          <div class="text-2xl font-bold" [class.text-red-600]="report()!.git.totalUncommitted > 100">
            {{ report()!.git.totalUncommitted }}
          </div>
        </div>
        <div class="border rounded-xl bg-white p-4 text-center">
          <div class="text-xs text-gray-500 mb-1">Untracked</div>
          <div class="text-2xl font-bold text-red-600">{{ report()!.git.untracked }}</div>
        </div>
        <div class="border rounded-xl bg-white p-4 text-center">
          <div class="text-xs text-gray-500 mb-1">Modified</div>
          <div class="text-2xl font-bold text-amber-600">{{ report()!.git.modified }}</div>
        </div>
        <div class="border rounded-xl bg-white p-4 text-center">
          <div class="text-xs text-gray-500 mb-1">Staged</div>
          <div class="text-2xl font-bold text-blue-600">{{ report()!.git.staged }}</div>
        </div>
        <div class="border rounded-xl bg-white p-4 text-center">
          <div class="text-xs text-gray-500 mb-1">TSC Errors</div>
          <div class="text-2xl font-bold" [class.text-red-600]="report()!.codeQuality.tscErrors > 0">
            {{ report()!.codeQuality.tscErrors }}
          </div>
        </div>
        <div class="border rounded-xl bg-white p-4 text-center">
          <div class="text-xs text-gray-500 mb-1">Categories</div>
          <div class="text-2xl font-bold">{{ report()!.componentSummary.totalCategories }}</div>
        </div>
        <div class="border rounded-xl bg-white p-4 text-center">
          <div class="text-xs text-gray-500 mb-1">Diff +/-</div>
          <div class="text-sm font-bold">
            <span class="text-green-600">+{{ report()!.git.diffStat.insertions }}</span>
            <span class="text-red-600 ms-1">-{{ report()!.git.diffStat.deletions }}</span>
          </div>
        </div>
      </div>

      <!-- Component Health Summary (visual bar) -->
      <div *ngIf="report()" class="border rounded-2xl bg-white p-5">
        <div class="font-semibold mb-3">Component Health Overview</div>
        <div class="flex rounded-full overflow-hidden h-6 bg-gray-100">
          <div class="bg-emerald-500 transition-all" [style.width.%]="healthPct('green')"></div>
          <div class="bg-amber-400 transition-all" [style.width.%]="healthPct('yellow')"></div>
          <div class="bg-red-500 transition-all" [style.width.%]="healthPct('red')"></div>
        </div>
        <div class="flex gap-6 mt-2 text-xs text-gray-600">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Healthy: {{ report()!.componentSummary.healthyCategories }}</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Warning: {{ report()!.componentSummary.warningCategories }}</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Critical: {{ report()!.componentSummary.criticalCategories }}</span>
        </div>
      </div>

      <!-- Component Group Grid -->
      <div *ngIf="report()" class="border rounded-2xl bg-white p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="font-semibold">Component Tracking ({{ report()!.components.length }} auto-discovered)</div>
          <div class="flex gap-2">
            <button *ngFor="let f of filterOptions" class="text-xs px-3 py-1 rounded-full border transition"
              [class.bg-gray-900]="activeFilter() === f" [class.text-white]="activeFilter() === f"
              (click)="activeFilter.set(f)">{{ f }}</button>
          </div>
        </div>

        <!-- Group-by accordion -->
        <div *ngFor="let grp of filteredGroups()" class="mb-4">
          <div class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 cursor-pointer"
            (click)="toggleGroup(grp.name)">
            <span class="text-xs transition-transform" [class.rotate-90]="expandedGroups().has(grp.name)">&#9654;</span>
            {{ grp.name }}
            <span class="text-xs text-gray-400">({{ grp.components.length }})</span>
            <span *ngIf="grp.criticalCount > 0" class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{{ grp.criticalCount }} critical</span>
            <span *ngIf="grp.warningCount > 0" class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{{ grp.warningCount }} warning</span>
          </div>
          <div *ngIf="expandedGroups().has(grp.name)" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ms-4">
            <div *ngFor="let c of grp.components" class="border rounded-lg p-3 text-sm"
              [class.border-red-300]="c.health === 'red'"
              [class.bg-red-50]="c.health === 'red'"
              [class.border-amber-300]="c.health === 'yellow'"
              [class.bg-amber-50]="c.health === 'yellow'"
              [class.border-gray-200]="c.health === 'green'">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium truncate" [title]="c.category">{{ shortName(c.category) }}</span>
                <span class="w-2 h-2 rounded-full shrink-0"
                  [class.bg-emerald-500]="c.health === 'green'"
                  [class.bg-amber-400]="c.health === 'yellow'"
                  [class.bg-red-500]="c.health === 'red'"></span>
              </div>
              <div class="text-xs text-gray-500 flex gap-3">
                <span>{{ c.tracked }} tracked</span>
                <span *ngIf="c.untracked > 0" class="text-red-600 font-medium">{{ c.untracked }} untracked</span>
                <span *ngIf="c.modified > 0" class="text-amber-600">{{ c.modified }} modified</span>
                <span *ngIf="c.staged > 0" class="text-blue-600">{{ c.staged }} staged</span>
              </div>
              <div *ngIf="c.files.length > 0" class="mt-1 text-xs text-gray-400 truncate" [title]="c.files.join(', ')">
                {{ c.files[0] }}{{ c.files.length > 1 ? ' (+' + (c.files.length - 1) + ' more)' : '' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Trend Chart (ASCII-style bar sparkline) -->
      <div *ngIf="history().length > 1" class="border rounded-2xl bg-white p-5">
        <div class="font-semibold mb-3">Trend History (last {{ history().length }} scans)</div>
        <div class="flex items-end gap-0.5 h-24 overflow-hidden">
          <div *ngFor="let h of history()" class="flex-1 flex flex-col items-stretch gap-px justify-end min-w-[3px]"
            [title]="(h.timestamp | date:'short') + ' — ' + h.untracked + ' untracked, ' + h.modified + ' modified'">
            <div class="bg-red-400 rounded-t-sm" [style.height.px]="barHeight(h.untracked, maxUntracked())"></div>
            <div class="bg-amber-400" [style.height.px]="barHeight(h.modified, maxModified())"></div>
            <div class="bg-blue-400 rounded-b-sm" [style.height.px]="barHeight(h.staged, maxStaged())"></div>
          </div>
        </div>
        <div class="flex gap-6 mt-2 text-xs text-gray-500">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span> Untracked</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Modified</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span> Staged</span>
        </div>
      </div>

      <!-- Code Quality -->
      <div *ngIf="report() && report()!.codeQuality.topErrorFiles.length > 0" class="border rounded-2xl bg-white p-5">
        <div class="font-semibold mb-3">Code Quality — Top Error Files</div>
        <table [attr.aria-label]="'TypeScript error files'" class="min-w-full text-sm">
          <thead>
            <tr class="text-left border-b text-gray-500">
              <th class="py-2 pe-4">File</th>
              <th class="py-2 pe-4 text-right">Errors</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of report()!.codeQuality.topErrorFiles" class="border-b">
              <td class="py-1.5 pe-4 font-mono text-xs truncate max-w-xs" [title]="f.file">{{ f.file }}</td>
              <td class="py-1.5 pe-4 text-right text-red-600 font-semibold">{{ f.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Alerts -->
      <div *ngIf="report() && report()!.alerts.length > 0" class="border rounded-2xl bg-white p-5">
        <div class="font-semibold mb-3">Active Alerts ({{ report()!.alerts.length }})</div>
        <div class="space-y-1.5 max-h-64 overflow-y-auto">
          <div *ngFor="let a of report()!.alerts" class="text-sm px-3 py-2 rounded-lg"
            [class.bg-red-50]="a.startsWith('CRITICAL')"
            [class.text-red-800]="a.startsWith('CRITICAL')"
            [class.bg-amber-50]="a.startsWith('WARNING')"
            [class.text-amber-800]="a.startsWith('WARNING')"
            [class.bg-blue-50]="a.startsWith('CODE_QUALITY')"
            [class.text-blue-800]="a.startsWith('CODE_QUALITY')">
            {{ a }}
          </div>
        </div>
      </div>

      <!-- Git commit info -->
      <div *ngIf="report()" class="border rounded-2xl bg-white p-5 text-sm text-gray-600">
        <div class="font-semibold text-gray-900 mb-2">Git Info</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><span class="text-gray-400">Branch:</span> <span class="font-mono">{{ report()!.git.branch }}</span></div>
          <div><span class="text-gray-400">Last commit:</span> {{ report()!.git.lastCommitAge }}</div>
          <div class="col-span-2"><span class="text-gray-400">Message:</span> {{ report()!.git.lastCommitMessage }}</div>
        </div>
      </div>

    </div>
  `
})
export class WorkspaceAuditPageComponent implements OnInit {
  private api = inject(WorkspaceAuditApiService);
  readonly i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);

  readonly report = signal<WorkspaceAuditReport | null>(null);
  readonly history = signal<AuditHistoryEntry[]>([]);
  readonly loading = signal(false);
  readonly activeFilter = signal<string>('All');
  readonly expandedGroups = signal<Set<string>>(new Set());
  readonly filterOptions = ['All', 'Critical', 'Warning', 'Healthy'];

  ngOnInit() {
    this.load();
    interval(60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  async load() {
    try {
      const [latest, hist] = await Promise.all([
        firstValueFrom(this.api.getLatest()),
        firstValueFrom(this.api.getHistory()),
      ]);
      this.report.set(latest);
      this.history.set(hist);

      if (!this.expandedGroups().size) {
        const groups = this.getGroups(latest.components);
        const initial = new Set<string>();
        for (const g of groups) {
          if (g.criticalCount > 0 || g.warningCount > 0) initial.add(g.name);
        }
        this.expandedGroups.set(initial);
      }
    } catch { /* silent — report may not exist yet */ }
  }

  async runNow() {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.api.runNow());
      this.report.set(result);
      const hist = await firstValueFrom(this.api.getHistory());
      this.history.set(hist);
    } finally {
      this.loading.set(false);
    }
  }

  statusBannerClass(): string {
    const s = this.report()?.status;
    if (s === 'critical') return 'bg-red-50 border border-red-200 text-red-900';
    if (s === 'warnings') return 'bg-amber-50 border border-amber-200 text-amber-900';
    return 'bg-emerald-50 border border-emerald-200 text-emerald-900';
  }

  statusIcon(): string {
    const s = this.report()?.status;
    if (s === 'critical') return '\u26D4';
    if (s === 'warnings') return '\u26A0\uFE0F';
    return '\u2705';
  }

  healthPct(health: string): number {
    const r = this.report();
    if (!r || r.componentSummary.totalCategories === 0) return 0;
    const count = health === 'green' ? r.componentSummary.healthyCategories
      : health === 'yellow' ? r.componentSummary.warningCategories
      : r.componentSummary.criticalCategories;
    return (count / r.componentSummary.totalCategories) * 100;
  }

  private getGroups(components: ComponentTrackingResult[]): { name: string; components: ComponentTrackingResult[]; criticalCount: number; warningCount: number }[] {
    const map = new Map<string, ComponentTrackingResult[]>();
    for (const c of components) {
      const list = map.get(c.group) || [];
      list.push(c);
      map.set(c.group, list);
    }
    return [...map.entries()]
      .map(([name, comps]) => ({
        name,
        components: comps,
        criticalCount: comps.filter(c => c.health === 'red').length,
        warningCount: comps.filter(c => c.health === 'yellow').length,
      }))
      .sort((a, b) => (b.criticalCount + b.warningCount) - (a.criticalCount + a.warningCount));
  }

  filteredGroups() {
    const r = this.report();
    if (!r) return [];
    const all = this.getGroups(r.components);
    const f = this.activeFilter();
    if (f === 'All') return all;
    const healthFilter = f === 'Critical' ? 'red' : f === 'Warning' ? 'yellow' : 'green';
    return all
      .map(g => ({
        ...g,
        components: g.components.filter(c => c.health === healthFilter),
      }))
      .filter(g => g.components.length > 0);
  }

  toggleGroup(name: string) {
    const s = new Set(this.expandedGroups());
    if (s.has(name)) s.delete(name); else s.add(name);
    this.expandedGroups.set(s);
  }

  shortName(category: string): string {
    const parts = category.split(' > ');
    return parts.length > 1 ? parts[1] : parts[0];
  }

  maxUntracked(): number {
    return Math.max(1, ...this.history().map(h => h.untracked));
  }

  maxModified(): number {
    return Math.max(1, ...this.history().map(h => h.modified));
  }

  maxStaged(): number {
    return Math.max(1, ...this.history().map(h => h.staged));
  }

  barHeight(value: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(1, Math.round((value / max) * 30));
  }
}
