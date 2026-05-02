import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VendorService } from '../../services/vendor.service';
import { Vendor } from '@dos/types/vendor';

@Component({
  selector: 'dos-vendor-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-6 bg-surface-50 dark:bg-surface-900 min-h-screen" [dir]="direction()">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0 m-0">Vendor Management</h1>
          <p class="text-surface-500 dark:text-surface-400 mt-1">Enterprise third-party risk and compliance</p>
        </div>
        <button class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md font-medium transition-colors cursor-not-allowed opacity-50" title="DAuth Access Required">
          <i class="pi pi-plus mr-2"></i> Onboard Vendor
        </button>
      </div>

      <!-- Table Section -->
      <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        
        <!-- Loading State -->
        <div *ngIf="loading()" class="p-6 text-center">
          <i class="pi pi-spin pi-spinner text-3xl text-primary-500 mb-3"></i>
          <p class="text-surface-500">Loading vendor portfolio...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading() && vendors().length === 0" class="p-12 text-center">
          <div class="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-briefcase text-2xl text-surface-400"></i>
          </div>
          <h3 class="text-xl font-semibold mb-2">No Vendors Found</h3>
          <p class="text-surface-500 max-w-md mx-auto">Your vendor portfolio is empty. Start by onboarding a new vendor to analyze risk profiles or assess SLA compliance.</p>
        </div>

        <!-- Data Grid -->
        <table *ngIf="!loading() && vendors().length > 0" class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
              <th class="p-4 font-semibold text-sm text-surface-600 dark:text-surface-300">Vendor Name</th>
              <th class="p-4 font-semibold text-sm text-surface-600 dark:text-surface-300">Category</th>
              <th class="p-4 font-semibold text-sm text-surface-600 dark:text-surface-300">Tier</th>
              <th class="p-4 font-semibold text-sm text-surface-600 dark:text-surface-300">Status</th>
              <th class="p-4 font-semibold text-sm text-surface-600 dark:text-surface-300 text-right">Risk Score</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let v of vendors()" class="border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
              <td class="p-4">
                <div class="font-medium text-surface-900 dark:text-surface-0">{{ v.name }}</div>
                <div class="text-xs text-surface-500">{{ v.id | slice:0:8 }}</div>
              </td>
              <td class="p-4"><span class="text-sm bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded">{{ v.category || 'Unspecified' }}</span></td>
              <td class="p-4">
                <span class="text-sm px-2 py-1 rounded" 
                      [ngClass]="{
                        'bg-red-100 text-red-800': v.tier === 'critical',
                        'bg-orange-100 text-orange-800': v.tier === 'high',
                        'bg-blue-100 text-blue-800': v.tier === 'medium',
                        'bg-surface-100 text-surface-800': !v.tier || v.tier === 'low'
                      }">
                  {{ (v.tier | uppercase) || 'N/A' }}
                </span>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" [ngClass]="v.status === 'active' ? 'bg-green-500' : 'bg-orange-500'"></div>
                  <span class="text-sm">{{ v.status | uppercase }}</span>
                </div>
              </td>
              <td class="p-4 text-right font-mono">{{ v.risk_score ? (v.risk_score | number:'1.1-1') : '--' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class VendorListComponent implements OnInit {
  private vendorService = inject(VendorService);
  
  vendors = signal<any[]>([]);
  loading = signal<boolean>(true);
  direction = signal<'ltr' | 'rtl'>('ltr'); // Will connect to i18n service in real app

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);
    this.vendorService.getVendors().subscribe({
      next: (res) => {
        this.vendors.set(res.vendors || []);
        this.loading.set(false);
      },
      error: () => {
        this.emptyFallback();
      }
    });
  }

  private emptyFallback() {
    this.loading.set(false);
    this.vendors.set([]);
  }
}
