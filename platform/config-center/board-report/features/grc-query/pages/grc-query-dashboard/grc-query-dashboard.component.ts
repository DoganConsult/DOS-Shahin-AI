import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-grc-query-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="query-container p-6 w-full" [dir]="'ltr'" style="margin-inline-start: auto;">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">GRC Query Engine</h1>
      <p class="text-gray-500 mb-6">Cross-module federated search and natural language queries</p>

      <!-- Search Input -->
      <div class="mb-6">
        <div class="flex gap-3">
          <input type="text" [(ngModel)]="searchQuery" placeholder="Search across Risk, Compliance, Audit, Incidents..."
            class="flex-grow border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <button (click)="executeSearch()" class="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 transition font-medium">Search</button>
        </div>
      </div>

      <div *ngIf="isSearching" class="flex items-center justify-center py-10 animate-pulse bg-gray-50 rounded">
        <div class="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="ms-3 text-indigo-600">Querying modules...</span>
      </div>

      <div *ngIf="!isSearching && results.length > 0" class="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div class="px-5 py-3 bg-gray-50 border-b flex justify-between items-center">
          <span class="text-sm font-medium text-gray-600">{{ results.length }} results from {{ moduleHits.length }} modules</span>
          <span class="text-xs text-gray-400">{{ executionTime }}ms</span>
        </div>
        <div *ngFor="let r of results" class="px-5 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-3">
            <span class="text-xs px-2 py-0.5 rounded font-medium bg-indigo-50 text-indigo-700">{{ r.sourceModule }}</span>
            <span class="text-sm text-gray-800">{{ r.id }}</span>
          </div>
        </div>
      </div>

      <!-- Saved Queries -->
      <div *ngIf="savedQueries.length > 0" class="mt-8">
        <h2 class="text-lg font-bold text-gray-800 mb-3">Saved Queries</h2>
        <div *ngFor="let q of savedQueries" class="flex items-center justify-between p-3 bg-white border rounded mb-2 hover:shadow-sm transition-shadow cursor-pointer">
          <div><p class="font-medium text-gray-800">{{ q.name }}</p><p class="text-xs text-gray-400">{{ q.description }}</p></div>
          <button class="text-indigo-600 text-sm">Run →</button>
        </div>
      </div>
    </div>
  \`
})
export class GrcQueryDashboardComponent implements OnInit {
  searchQuery = ''; isSearching = false; results: any[] = []; moduleHits: string[] = []; executionTime = 0; savedQueries: any[] = [];
  ngOnInit() {
    this.savedQueries = [
      { name: 'High-Risk Items', description: 'All items with risk score > 8' },
      { name: 'Overdue Compliance', description: 'Compliance items past due date' }
    ];
  }
  executeSearch() {
    if (!this.searchQuery.trim()) return;
    this.isSearching = true;
    setTimeout(() => {
      this.isSearching = false;
      this.moduleHits = ['risk', 'compliance', 'audit'];
      this.executionTime = 142;
      this.results = [
        { id: 'RISK-001', sourceModule: 'risk' },
        { id: 'COMP-042', sourceModule: 'compliance' },
        { id: 'AUD-019', sourceModule: 'audit' }
      ];
    }, 800);
  }
}
