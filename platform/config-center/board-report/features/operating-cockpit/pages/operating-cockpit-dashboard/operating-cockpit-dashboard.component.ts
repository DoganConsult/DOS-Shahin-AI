import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-operating-cockpit-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="cockpit-container p-6 w-full bg-gray-900 min-h-screen text-white" [dir]="'ltr'" style="margin-inline-start: auto;">
      <div class="flex justify-between items-center mb-6">
        <div><h1 class="text-2xl font-bold">Operating Cockpit</h1><p class="text-gray-400 text-sm mt-1">Unified NOC-style operational command center</p></div>
        <span class="text-xs px-3 py-1 bg-green-900 text-green-300 rounded-full font-mono" *ngIf="!isLoading">● LIVE {{ lastRefresh }}</span>
      </div>

      <div *ngIf="isLoading" class="grid grid-cols-2 md:grid-cols-5 gap-3"><div *ngFor="let i of [1,2,3,4,5]" class="bg-gray-800 animate-pulse rounded-lg h-20"></div></div>

      <!-- Health Grid -->
      <div *ngIf="!isLoading" class="mb-6">
        <h2 class="text-sm text-gray-500 uppercase tracking-wider mb-3">Module Health Grid</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div *ngFor="let m of modules" class="p-3 rounded-lg border"
            [class]="m.status === 'healthy' ? 'bg-green-900/30 border-green-800' : m.status === 'degraded' ? 'bg-yellow-900/30 border-yellow-800' : 'bg-red-900/30 border-red-800'">
            <div class="flex items-center gap-2">
              <span [class]="m.status === 'healthy' ? 'text-green-400' : m.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'">●</span>
              <span class="text-sm font-medium">{{ m.name }}</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ m.responseTime }}ms</p>
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div *ngIf="!isLoading" class="mb-6">
        <h2 class="text-sm text-gray-500 uppercase tracking-wider mb-3">Active Alerts ({{ alerts.length }})</h2>
        <div *ngIf="alerts.length === 0" class="text-center py-8 text-gray-600 bg-gray-800/50 rounded-lg">No active alerts — all systems nominal.</div>
        <div *ngFor="let a of alerts" class="flex items-center justify-between p-3 rounded-lg mb-2"
          [class]="a.severity === 'critical' ? 'bg-red-900/30 border border-red-800' : a.severity === 'warning' ? 'bg-yellow-900/30 border border-yellow-800' : 'bg-blue-900/30 border border-blue-800'">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold uppercase px-2 py-0.5 rounded"
              [class]="a.severity === 'critical' ? 'bg-red-700 text-red-100' : a.severity === 'warning' ? 'bg-yellow-700 text-yellow-100' : 'bg-blue-700 text-blue-100'">{{ a.severity }}</span>
            <div><p class="text-sm font-medium">{{ a.title }}</p><p class="text-xs text-gray-500">{{ a.source }} · {{ a.time }}</p></div>
          </div>
          <button class="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded hover:bg-gray-600 transition">Acknowledge</button>
        </div>
      </div>
    </div>
  \`
})
export class OperatingCockpitDashboardComponent implements OnInit, OnDestroy {
  isLoading = true; modules: any[] = []; alerts: any[] = []; lastRefresh = ''; private interval: any;
  ngOnInit() { this.load(); this.interval = setInterval(() => this.load(), 15000); }
  ngOnDestroy() { clearInterval(this.interval); }
  load() {
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      this.lastRefresh = new Date().toLocaleTimeString();
      this.modules = [
        { name: 'Risk', status: 'healthy', responseTime: 12 },
        { name: 'Compliance', status: 'healthy', responseTime: 18 },
        { name: 'Audit', status: 'healthy', responseTime: 9 },
        { name: 'Incidents', status: 'degraded', responseTime: 142 },
        { name: 'Evidence', status: 'healthy', responseTime: 15 },
        { name: 'Actions', status: 'healthy', responseTime: 8 },
        { name: 'Controls', status: 'healthy', responseTime: 11 },
        { name: 'Knowledge', status: 'healthy', responseTime: 7 },
        { name: 'Playbooks', status: 'healthy', responseTime: 13 },
        { name: 'Attestation', status: 'healthy', responseTime: 10 }
      ];
      this.alerts = [
        { severity: 'warning', title: 'Incident module response time elevated', source: 'incident', time: '3 min ago' },
        { severity: 'info', title: 'Scheduled maintenance window in 2 hours', source: 'admin', time: '15 min ago' }
      ];
    }, 500);
  }
}
