import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ColumnDef {
  field: string;
  header: string;
  type: string;
  visible: boolean;
  sortable?: boolean;
}

interface ListConfig {
  title: string;
  subtitle?: string;
  icon?: string;
  columns: ColumnDef[];
  pagination: { rows: number };
  searchable?: boolean;
}

interface ListItem {
  id: string;
  [key: string]: unknown;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-compliance-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-surface-50 dark:bg-surface-900 min-h-screen">

      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold font-sans">
            <i class=" mr-2"></i>
            {{ config()?.title || 'Compliance Register' }}
          </h1>
          <p class="text-surface-500 text-sm mt-1">{{ config()?.subtitle }}</p>
        </div>
        <span class="text-sm text-surface-400">{{ total() }} records</span>
      </div>

      <div class="mb-4" *ngIf="config()?.searchable">
        <input
          type="text"
          class="w-full border border-surface-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Search compliance assessments..."
          [(ngModel)]="searchQuery"
          (keyup.enter)="loadData()"
        />
      </div>

      <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 overflow-hidden">

        <div *ngIf="loading()" class="p-12 text-center text-surface-500">
          <i class=" pi-spinner text-2xl mb-3 block"></i>
          Loading compliance records...
        </div>

        <div *ngIf="error()" class="p-12 text-center text-red-500">
          <i class=" text-2xl mb-3 block"></i>
          {{ error() }}
        </div>

        <div *ngIf="!loading() && !error() && items().length === 0" class="p-12 text-center text-surface-500">
          <i class=" text-3xl mb-3 block opacity-30"></i>
          <p class="font-medium">No compliance assessments found</p>
          <p class="text-sm mt-1">No records match your current search. Try adjusting your filters.</p>
        </div>

        <div *ngIf="!loading() && !error() && items().length > 0" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-surface-50 border-b border-surface-200">
                <th *ngFor="let col of visibleColumns()"
                    class="p-4 font-semibold text-surface-600 whitespace-nowrap cursor-pointer hover:bg-surface-100"
                    (click)="col.sortable && sort(col.field)">
                  {{ col.header }}
                  <i *ngIf="sortField === col.field"
                     class="pi ml-1"
                     [class.pi-sort-up]="sortOrder === 1"
                     [class.pi-sort-down]="sortOrder === -1"></i>
                </th>
                <th class="p-4 font-semibold text-surface-600">AI Score</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of items()"
                  class="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                <td *ngFor="let col of visibleColumns()" class="p-4">
                  <ng-container [ngSwitch]="col.type">
                    <span *ngSwitchCase="'status'"
                          class="px-2 py-1 rounded-full text-xs font-medium"
                          [class]="statusClass(item[col.field])">
                      {{ item[col.field] }}
                    </span>
                    <span *ngSwitchCase="'date'">{{ item[col.field] | date:'dd MMM yyyy' }}</span>
                    <span *ngSwitchDefault>{{ item[col.field] || '—' }}</span>
                  </ng-container>
                </td>
                <td class="p-4">
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 w-16 rounded-full bg-surface-200 overflow-hidden">
                      <div class="h-full rounded-full"
                           [style.width.%]="item['ai_confidence'] || 0"
                           [class]="aiScoreBarClass(item['ai_confidence'])"></div>
                    </div>
                    <span class="text-xs text-surface-500">{{ item['ai_confidence'] || 0 }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="!loading() && !error() && total() > pageSize"
             class="flex justify-between items-center p-4 border-t border-surface-100">
          <span class="text-sm text-surface-500">
            Showing {{ first + 1 }}–{{ first + items().length }} of {{ total() }}
          </span>
          <div class="flex gap-2">
            <button class="px-3 py-1 rounded border text-sm disabled:opacity-40"
                    [disabled]="first === 0"
                    (click)="prevPage()">Previous</button>
            <button class="px-3 py-1 rounded border text-sm disabled:opacity-40"
                    [disabled]="first + pageSize >= total()"
                    (click)="nextPage()">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ComplianceHubComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private readonly MODULE_CODE = 'compliance';
  private readonly configApi = `/api/module-config/${this.MODULE_CODE}`;

  config = signal<ListConfig | null>(null);
  items = signal<ListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  total = signal(0);

  searchQuery = '';
  sortField = 'updated_at';
  sortOrder: 1 | -1 = -1;
  first = 0;
  pageSize = 25;

  visibleColumns = computed(() =>
    (this.config()?.columns ?? []).filter(c => c.visible)
  );

  ngOnInit(): void {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.http.get<ListConfig>(`${this.configApi}/list`).subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        this.pageSize = cfg.pagination?.rows ?? 25;
        this.loadData();
      },
      error: () => {
        this.config.set(null);
        this.loadData();
      },
    });
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.post<{ items: ListItem[]; total: number }>(
      `${this.configApi}/list-data`,
      {
        first: this.first,
        rows: this.pageSize,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        globalFilter: this.searchQuery || undefined,
      }
    ).subscribe({
      next: (res) => {
        this.items.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load compliance records. Please try again.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  sort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 1 ? -1 : 1;
    } else {
      this.sortField = field;
      this.sortOrder = -1;
    }
    this.first = 0;
    this.loadData();
  }

  prevPage(): void {
    this.first = Math.max(0, this.first - this.pageSize);
    this.loadData();
  }

  nextPage(): void {
    this.first = this.first + this.pageSize;
    this.loadData();
  }

  statusClass(value: unknown): string {
    const s = String(value ?? '').toLowerCase();
    if (['non_compliant', 'critical', 'breach'].includes(s)) return 'bg-red-100 text-red-700';
    if (['high', 'partial', 'under_review', 'in_progress'].includes(s)) return 'bg-orange-100 text-orange-700';
    if (['medium', 'not_started'].includes(s)) return 'bg-blue-100 text-blue-700';
    if (['compliant', 'low', 'closed'].includes(s)) return 'bg-green-100 text-green-700';
    if (['waived', 'accepted'].includes(s)) return 'bg-surface-100 text-surface-600';
    return 'bg-surface-100 text-surface-500';
  }

  aiScoreBarClass(score: unknown): string {
    const n = Number(score ?? 0);
    if (n >= 75) return 'bg-red-500';
    if (n >= 50) return 'bg-orange-400';
    if (n >= 25) return 'bg-blue-400';
    return 'bg-green-400';
  }
}
