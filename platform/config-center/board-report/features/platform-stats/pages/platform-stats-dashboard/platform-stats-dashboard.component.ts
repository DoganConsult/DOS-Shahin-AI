import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-platform-stats-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="stats-container p-6 w-full" [dir]="'ltr'" style="margin-inline-start: auto;">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Platform Statistics</h1>
          <p class="text-gray-500 text-sm mt-1">Real-time platform health and operational KPIs</p>
        </div>
        <span class="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium" *ngIf="!isLoading && !error">● Live</span>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div *ngFor="let i of [1,2,3,4]" class="bg-gray-100 animate-pulse rounded-lg h-28"></div>
      </div>

      <!-- Error -->
      <div *ngIf="!isLoading && error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <h3 class="font-bold">Failed to load platform statistics</h3>
        <p>{{ error }}</p>
        <button (click)="loadData()" class="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200">Retry</button>
      </div>

      <!-- KPI Cards -->
      <div *ngIf="!isLoading && !error" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div *ngFor="let kpi of kpis" class="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">{{ kpi.name }}</p>
          <p class="text-3xl font-bold text-gray-800">{{ kpi.value }}</p>
          <div class="flex items-center mt-2">
            <span [class]="kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-400'" class="text-sm font-medium">
              {{ kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→' }} {{ kpi.change }}
            </span>
          </div>
        </div>
      </div>

      <!-- Health Grid -->
      <div *ngIf="!isLoading && !error" class="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 class="text-lg font-bold text-gray-800 mb-4">System Health</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div *ngFor="let svc of services" class="flex items-center gap-2 p-3 rounded-md"
               [class]="svc.status === 'healthy' ? 'bg-green-50' : svc.status === 'degraded' ? 'bg-yellow-50' : 'bg-red-50'">
            <span [class]="svc.status === 'healthy' ? 'text-green-500' : svc.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'" class="text-xl">●</span>
            <div>
              <p class="text-sm font-medium text-gray-700">{{ svc.name }}</p>
              <p class="text-xs text-gray-400">{{ svc.latency }}ms</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  \`
})
export class PlatformStatsDashboardComponent implements OnInit, OnDestroy {
  isLoading = true;
  error: string | null = null;
  kpis: any[] = [];
  services: any[] = [];
  private refreshInterval: any;

  ngOnInit() { this.loadData(); this.refreshInterval = setInterval(() => this.loadData(), 30000); }
  ngOnDestroy() { clearInterval(this.refreshInterval); }

  loadData() {
    this.isLoading = true; this.error = null;
    setTimeout(() => {
      this.isLoading = false;
      this.kpis = [
        { name: 'Active Users', value: '1,247', trend: 'up', change: '+12%' },
        { name: 'API Calls / hr', value: '48.3K', trend: 'up', change: '+5%' },
        { name: 'Error Rate', value: '0.12%', trend: 'down', change: '-0.03%' },
        { name: 'Avg Response', value: '142ms', trend: 'down', change: '-8ms' }
      ];
      this.services = [
        { name: 'Database', status: 'healthy', latency: 12 },
        { name: 'Redis', status: 'healthy', latency: 3 },
        { name: 'Event Bus', status: 'healthy', latency: 8 },
        { name: 'AI Gateway', status: 'healthy', latency: 45 },
        { name: 'Auth', status: 'healthy', latency: 6 }
      ];
    }, 600);
  }
}
