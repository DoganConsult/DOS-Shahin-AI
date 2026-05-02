import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-attestation-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="attestation-container p-6 w-full" [dir]="'ltr'" style="margin-inline-start: auto;">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Attestation Management</h1>
      <p class="text-gray-500 mb-6">Manage attestation campaigns and compliance evidence submissions.</p>

      <!-- Loading -->
      <div *ngIf="isLoading" class="flex items-center justify-center py-16 bg-gray-50 rounded animate-pulse">
        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="ms-3 text-indigo-600 font-medium">Loading campaigns...</span>
      </div>

      <!-- Error -->
      <div *ngIf="!isLoading && error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <h3 class="font-bold">Could not load attestation data</h3>
        <p>{{ error }}</p>
        <button (click)="load()" class="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded">Retry</button>
      </div>

      <!-- Empty -->
      <div *ngIf="!isLoading && !error && campaigns.length === 0" class="text-center py-16 bg-gray-50 border border-gray-100 rounded-lg">
        <h3 class="text-xl font-medium text-gray-700">No attestation campaigns</h3>
        <p class="text-gray-500 mt-2">Create your first campaign to start collecting attestations.</p>
        <button class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700">Create Campaign</button>
      </div>

      <!-- Data -->
      <div *ngIf="!isLoading && !error && campaigns.length > 0">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p class="text-sm text-blue-600 font-medium">Total Campaigns</p>
            <p class="text-2xl font-bold text-blue-900">{{ campaigns.length }}</p>
          </div>
          <div class="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p class="text-sm text-amber-600 font-medium">Pending Records</p>
            <p class="text-2xl font-bold text-amber-900">{{ pendingCount }}</p>
          </div>
          <div class="bg-green-50 border border-green-100 rounded-lg p-4">
            <p class="text-sm text-green-600 font-medium">Completed</p>
            <p class="text-2xl font-bold text-green-900">{{ completedCount }}</p>
          </div>
        </div>
        <div *ngFor="let c of campaigns" class="bg-white border rounded-lg p-5 mb-3 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start">
            <div><h2 class="text-lg font-bold text-gray-800">{{ c.title }}</h2><p class="text-sm text-gray-500">{{ c.type }} · {{ c.frequency }}</p></div>
            <span class="text-xs px-2 py-1 rounded font-semibold uppercase"
              [class]="c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'">{{ c.status }}</span>
          </div>
        </div>
      </div>
    </div>
  \`
})
export class AttestationDashboardComponent implements OnInit {
  isLoading = true; error: string | null = null; campaigns: any[] = [];
  pendingCount = 0; completedCount = 0;
  ngOnInit() { this.load(); }
  load() {
    this.isLoading = true; this.error = null;
    setTimeout(() => {
      this.isLoading = false;
      this.campaigns = [
        { title: 'Q4 Access Certification', type: 'periodic', frequency: 'quarterly', status: 'active' },
        { title: 'SOX Compliance Attestation', type: 'event_driven', frequency: 'annual', status: 'draft' }
      ];
      this.pendingCount = 14; this.completedCount = 38;
    }, 700);
  }
}
