import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-editor-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="editor-container p-6 w-full" [dir]="'ltr'" style="margin-inline-start: auto;">
      <div class="flex justify-between items-center mb-6">
        <div><h1 class="text-2xl font-bold text-gray-800">Dashboard Editor</h1><p class="text-gray-500 text-sm mt-1">Design, customize, and share dashboards</p></div>
        <button class="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition">+ New Layout</button>
      </div>

      <div *ngIf="isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-4"><div *ngFor="let i of [1,2,3]" class="bg-gray-100 animate-pulse rounded-lg h-40"></div></div>

      <div *ngIf="!isLoading && !error && layouts.length === 0" class="text-center py-16 bg-gray-50 border border-gray-100 rounded-lg">
        <h3 class="text-xl font-medium text-gray-700">No dashboards yet</h3>
        <p class="text-gray-500 mt-2">Create your first custom dashboard layout.</p>
      </div>

      <div *ngIf="!isLoading && !error && layouts.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div *ngFor="let l of layouts" class="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-bold text-gray-800">{{ l.name }}</h2>
            <span *ngIf="l.isGlobal" class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">Global</span>
          </div>
          <p class="text-sm text-gray-500">{{ l.widgets }} widgets</p>
          <p class="text-xs text-gray-400 mt-2">Last edited: {{ l.updated }}</p>
        </div>
      </div>
    </div>
  \`
})
export class DashboardEditorDashboardComponent implements OnInit {
  isLoading = true; error: string | null = null; layouts: any[] = [];
  ngOnInit() {
    setTimeout(() => {
      this.isLoading = false;
      this.layouts = [
        { name: 'Executive Overview', widgets: 8, isGlobal: true, updated: '2 hours ago' },
        { name: 'Risk Heatmap Layout', widgets: 5, isGlobal: false, updated: 'Yesterday' },
        { name: 'Compliance Tracker', widgets: 6, isGlobal: true, updated: '3 days ago' }
      ];
    }, 600);
  }
}
