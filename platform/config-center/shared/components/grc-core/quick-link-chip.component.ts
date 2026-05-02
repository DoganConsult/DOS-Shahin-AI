/**
 * Quick Link Chip Component
 * 
 * Displays related entity count badge with hover preview.
 * Requirements: 1.4, 1.7
 */
import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { devError } from '../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-quick-link-chip',
    imports: [CommonModule],
    template: `
    <span tabindex="0" role="button" (keyup.enter)="navigate()" class="quick-link-chip" (click)="navigate()" (mouseenter)="showPreview()" (mouseleave)="hidePreview()"
          role="link" [attr.aria-label]="entityType + ' links: ' + count">
      <i class="pi" [ngClass]="icon"></i>
      <span class="chip-label">{{ entityType }}</span>
      <span class="chip-count" *ngIf="count > 0">{{ count }}</span>
    </span>
    <div class="preview-overlay" *ngIf="previewVisible">
      <div class="preview-card">
        <div class="preview-title">{{ entityType }} ({{ count }})</div>
        <div *ngFor="let item of previewItems" class="preview-item">{{ item.title }}</div>
      </div>
    </div>
  `,
    styles: [`
    :host { position: relative; display: inline-block; }
    .quick-link-chip {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
      border-radius: var(--radius-xl); background: var(--surface-ground, #f5f5f5);
      border: 1px solid var(--surface-border, #e0e0e0); cursor: pointer;
      font-size: var(--font-size-caption); transition: all 0.15s;
    }
    .quick-link-chip:hover { background: var(--highlight-bg, #e8eaff); border-color: var(--primary-color, #4f46e5); }
    .chip-count {
      background: var(--primary-color, #4f46e5); color: #fff;
      border-radius: var(--radius-md); padding: 0 6px; font-size: var(--font-size-xs); font-weight: 600;
    }
    .preview-overlay { position: absolute; top: 100%; left: 0; z-index: var(--z-dropdown); padding-top: 4px; }
    .preview-card {
      background: var(--surface-card, #fff); border: 1px solid var(--surface-border, #ddd);
      border-radius: var(--radius); padding: 12px; min-width: 200px; box-shadow: var(--shadow-md);
    }
    .preview-title { font-weight: 600; margin-bottom: 8px; font-size: var(--font-size-tag); }
    .preview-item { font-size: var(--font-size-caption); padding: 4px 0; color: var(--text-color-secondary, #666); }
  `]
})
export class QuickLinkChipComponent {
  @Input() entityType = '';
  @Input() entityId = '';
  @Input() targetType = '';
  @Input() count = 0;
  @Input() icon = 'pi pi-link';

  previewVisible = false;
  previewItems: Array<{ title: string }> = [];

  constructor(private router: Router, private http: HttpClient) {}

  navigate(): void {
    this.router.navigate(['/entity-links', this.entityType, this.entityId]);
  }

  showPreview(): void {
    this.previewVisible = true;
    if (this.previewItems.length === 0 && this.entityType && this.entityId) {
      this.http.get<{ data: GrcRecord[] }>(
        `/api/entity-links/${this.entityType}/${this.entityId}?limit=5`
      ).subscribe({
        next: res => { this.previewItems = (res.data || []).map((l) => ({ title: (l.targetTitle || l.targetId || '') as string })); },
        error: (e) => devError("[API]", e)
      });
    }
  }

  hidePreview(): void { this.previewVisible = false; }

}
