import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-playbooks-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="playbooks-container p-6 w-full" [dir]="'ltr'" style="margin-inline-start: auto;">
      <div class="flex justify-between items-center mb-6">
        <div><h1 class="text-2xl font-bold text-gray-800">Playbooks</h1><p class="text-gray-500 text-sm mt-1">Structured response playbooks for incidents and remediation</p></div>
        <button class="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition">+ New Playbook</button>
      </div>

      <div *ngIf="isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-4"><div *ngFor="let i of [1,2,3]" class="bg-gray-100 animate-pulse rounded-lg h-40"></div></div>

      <div *ngIf="!isLoading && error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md"><h3 class="font-bold">Failed to load</h3><p>{{ error }}</p></div>

      <div *ngIf="!isLoading && !error && templates.length === 0" class="text-center py-16 bg-gray-50 border border-gray-100 rounded-lg">
        <h3 class="text-xl font-medium text-gray-700">No playbooks defined</h3>
        <p class="text-gray-500 mt-2">Create your first playbook template to get started.</p>
      </div>

      <div *ngIf="!isLoading && !error && templates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div *ngFor="let t of templates" class="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-3">
            <span class="text-xs font-semibold px-2 py-1 rounded uppercase tracking-wider"
              [class]="t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'">{{ t.status }}</span>
            <span class="text-xs text-gray-400">v{{ t.version }}</span>
          </div>
          <h2 class="text-lg font-bold text-gray-800 mb-1">{{ t.name }}</h2>
          <p class="text-sm text-gray-500 mb-3">{{ t.category }}</p>
          <div class="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
            <span class="text-xs text-gray-500">{{ t.steps }} steps</span>
            <button class="text-indigo-600 text-sm font-medium hover:text-indigo-800">Execute →</button>
          </div>
        </div>
      </div>
    </div>
  \`
})
export class PlaybooksDashboardComponent implements OnInit {
  isLoading = true; error: string | null = null; templates: any[] = [];
  ngOnInit() {
    setTimeout(() => {
      this.isLoading = false;
      this.templates = [
        { name: 'Data Breach Response', category: 'Security', status: 'active', version: 3, steps: 12 },
        { name: 'Vendor Onboarding', category: 'Operations', status: 'active', version: 2, steps: 8 },
        { name: 'Regulatory Audit Prep', category: 'Compliance', status: 'draft', version: 1, steps: 6 }
      ];
    }, 600);
  }
}
