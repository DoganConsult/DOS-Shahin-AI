import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-placeholder',
    imports: [CommonModule, RouterModule],
    template: `
    <div class="placeholder-shell">
      <div class="placeholder-card">
        <div class="placeholder-icon-wrap">
          <i class="pi pi-box placeholder-icon"></i>
        </div>
        <h2 class="placeholder-title">{{ pageTitle }}</h2>
        <p class="placeholder-desc">This module is scheduled for activation. Contact your administrator to enable it or check entitlements.</p>
        <div class="placeholder-meta">
          <span class="placeholder-badge">Module: {{ moduleCode() }}</span>
          <span class="placeholder-badge">Status: Pending Activation</span>
        </div>
        <div class="placeholder-actions">
          <a routerLink="/workspace-home" class="placeholder-btn placeholder-btn-primary">
            <i class="pi pi-home"></i> Back to Workspace
          </a>
          <a routerLink="/settings" class="placeholder-btn placeholder-btn-secondary">
            <i class="pi pi-cog"></i> Settings
          </a>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .placeholder-shell { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: 2rem; }
    .placeholder-card { text-align: center; max-width: 480px; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, #e5e7eb); border-radius: var(--radius-lg); padding: 2.5rem 2rem; box-shadow: var(--shadow-sm, 0 1px 2px rgba(var(--color-black-rgb), 0.05)); }
    .placeholder-icon-wrap { width: 64px; height: 64px; border-radius: 50%; background: var(--surface-ground, #f3f4f6); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
    .placeholder-icon { font-size: var(--font-size-3xl); color: var(--text-color-secondary, #6b7280); }
    .placeholder-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 0.75rem; color: var(--text-color, #1f2937); }
    .placeholder-desc { font-size: var(--font-size-base); color: var(--text-color-secondary, #6b7280); margin: 0 0 1.25rem; line-height: 1.5; }
    .placeholder-meta { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .placeholder-badge { font-size: var(--font-size-sm); padding: 0.25rem 0.75rem; border-radius: var(--radius-xs); background: var(--surface-ground, #f3f4f6); color: var(--text-color-secondary, #6b7280); }
    .placeholder-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    .placeholder-btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: var(--font-size-base); text-decoration: none; transition: background 0.15s, color 0.15s; }
    .placeholder-btn-primary { background: var(--primary-color, #3b82f6); color: #fff; }
    .placeholder-btn-primary:hover { background: var(--primary-700, #1d4ed8); }
    .placeholder-btn-secondary { background: var(--surface-ground, #f3f4f6); color: var(--text-color, #1f2937); }
    .placeholder-btn-secondary:hover { background: var(--surface-border, #e5e7eb); }
  `]
})
export class PlaceholderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  pageTitle = 'Module Pending Activation';
  moduleCode = signal('any');

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    if (data?.['title']) {
      this.pageTitle = data['title'];
    }
    const urlSegments = this.router.url.split('/').filter(Boolean);
    this.moduleCode.set(urlSegments[0] || 'any');
  }
}
