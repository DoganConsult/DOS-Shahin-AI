import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KsaRegulatoryApiService } from '../services/ksa-regulatory-api.service';
import { KsaRegulatoryRecord } from '../contracts/ksa-regulatory.contracts';

@Component({
  selector: 'dos-ksa-regulatory-hub',
  standalone: true,
  imports: [CommonModule],
  template: "<div class=\"p-6 bg-surface-50 dark:bg-surface-900 min-h-screen\"><div class=\"flex justify-between items-center mb-6\"><h1 class=\"text-2xl font-bold font-sans\">KsaRegulatory Hub</h1></div><div class=\"bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200\"><div *ngIf=\"loading()\" class=\"p-6 text-center text-surface-500\">Loading enterprise signals...</div><div *ngIf=\"!loading() && records().length === 0\" class=\"p-12 text-center text-surface-500\">Empty</div><table *ngIf=\"!loading() && records().length > 0\" class=\"w-full text-left\"><thead><tr class=\"bg-surface-50 border-b border-surface-200\"><th class=\"p-4\">ID</th><th class=\"p-4\">Status</th></tr></thead><tbody><tr *ngFor=\"let record of records()\" class=\"border-b border-surface-200\"><td class=\"p-4\">{{ record.id | slice:0:8 }}</td><td class=\"p-4 font-mono\">{{ record.status }}</td></tr></tbody></table></div></div>"
})
export class KsaRegulatoryHubComponent implements OnInit {
  private api = inject(KsaRegulatoryApiService);
  records = signal<KsaRegulatoryRecord[]>([]);
  loading = signal<boolean>(true);
  recordCount = computed(() => this.records().length);

  constructor() {
    effect(() => { console.log('[KsaRegulatory] Enterprise Signal Sync: ' + this.recordCount() + ' items'); });
  }

  ngOnInit() {
    this.api.list().subscribe({
      next: (res) => { this.records.set(res.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
