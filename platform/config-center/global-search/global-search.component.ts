import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

/**
 * Full-page Global Search Component
 * 
 * This is a full-page search experience, distinct from the dropdown search.
 * Selector renamed to avoid conflict with the canonical dropdown search.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-global-search-page',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, InputTextModule, TagModule, ButtonModule],
  template: `
    <app-page-shell icon="search" [title]="'Global Search'"
      [subtitle]="'Search across all GRC modules'"
      [breadcrumbs]="['Dashboard', 'Search']" [loading]="loading">
      <div class="search-bar">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search"></i>
          <input pInputText [(ngModel)]="query" placeholder="Search risks, policies, controls, frameworks..." aria-label="Search risks, policies, controls, frameworks..."
            class="w-full search-input" (keyup.enter)="search()" />
        </span>
        <p-button label="Search" icon="pi pi-search" (onClick)="search()" />
      </div>
      <div class="results" *ngIf="results.length > 0">
        <div *ngFor="let r of results" class="result-item">
          <div class="result-header">
            <p-tag [value]="r.module" severity="info" />
            <h4>{{ r.title || r.name || r.id }}</h4>
          </div>
          <p class="result-desc">{{ r.description || r.snippet || '' }}</p>
          <span class="result-meta">{{ r.created_at | appDate:'medium' }}</span>
        </div>
      </div>
      <div *ngIf="searched && results.length === 0 && !loading" class="empty-state">
        <i class="pi pi-search empty-icon"></i>
        <p>No results found for "{{ query }}"</p>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .search-bar{display:flex;gap:12px;margin-bottom:24px}.w-full{width:100%}
    .search-input{font-size: var(--font-size-md);padding:12px 12px 12px 40px}
    .results{display:flex;flex-direction:column;gap:8px}
    .result-item{padding:16px;border-radius:var(--radius-md);border:1px solid var(--border,var(--border-subtle));background:#fff}
    .result-item:hover{border-color:var(--primary,#1e40af)}
    .result-header{display:flex;align-items:center;gap:10px}
    .result-header h4{margin:0;font-size: var(--font-size-base);font-weight:600}
    .result-desc{font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted));margin:6px 0}
    .result-meta{font-size: var(--font-size-sm);color:var(--text-muted)}
    .empty-state{text-align:center;padding:48px;color:var(--text-muted)}
    .empty-icon{font-size:48px;display:block;margin-bottom:12px}
  `]
})
export class GlobalSearchComponent {
  private cdr = inject(ChangeDetectorRef);
  loading = false; query = ''; results: GrcRecord[] = []; searched = false;
  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}
  search() {
    if (!this.query.trim()) return;
    this.loading = true; this.searched = true;
    this.operationsSvc.globalSearch(this.query).subscribe({
      next: (d) => { this.results = Array.isArray(d) ? d : d.results || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

}
