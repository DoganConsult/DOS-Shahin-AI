import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FitchService } from '../../services/fitch.service';

@Component({
  selector: 'app-fitch-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container p-6 w-full" [dir]="'ltr'" style="margin-inline-start: auto;">
      <h1 class="text-2xl font-bold mb-4">Fitch Dashboard</h1>
      
      <!-- Loading State -->
      <div *ngIf="isLoading" class="flex items-center justify-center py-10 w-full animate-pulse bg-gray-50 rounded">
        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="ms-3 text-indigo-600 font-medium">Loading fitch data...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading && error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <h3 class="font-bold">Failed to load</h3>
        <p>{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && !error && items.length === 0" class="text-center py-16 bg-gray-50 border border-gray-100 rounded-lg">
        <h3 class="text-xl font-medium text-gray-700">No records found</h3>
        <p class="text-gray-500 mt-2">Create your first record to see it here.</p>
        <button class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded shadow">Create Record</button>
      </div>

      <!-- Data State -->
      <div *ngIf="!isLoading && !error && items.length > 0">
        <div *ngFor="let item of items" class="card p-4 border rounded shadow-sm mb-3">
          <p>{{ item.id }} - {{ item.status }}</p>
        </div>
      </div>
    </div>
  `
})
export class FitchDashboardComponent implements OnInit {
  isLoading = true;
  error: string | null = null;
  items: any[] = [];
  constructor(private svc: FitchService) {}
  ngOnInit() {
    this.svc.getRatings().subscribe({
      next: (res: any) => { this.items = res.data || []; this.isLoading = false; },
      error: (err: any) => { this.error = "Error fetching API."; this.isLoading = false; }
    });
  }
}
