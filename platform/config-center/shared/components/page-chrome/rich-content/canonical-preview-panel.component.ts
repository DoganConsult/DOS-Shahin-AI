import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

export interface PreviewSection {
  id: string;
  label: { en: string; ar: string };
  order: number;
  visible: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-canonical-preview-panel',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  template: `
    <aside class="canonical-preview" *ngIf="record" [class.cpp--open]="open">
      <div class="cpp-header">
        <span class="cpp-title">{{ record?.title || '' }}</span>
        <div class="cpp-actions">
          <button pButton icon="pi pi-external-link" [rounded]="true" [text]="true" size="small"
                  (click)="openDetail.emit(record)" [attr.aria-label]="'Open detail'"></button>
          <button pButton icon="pi pi-times" [rounded]="true" [text]="true" size="small"
                  (click)="closed.emit()" [attr.aria-label]="'Close preview'"></button>
        </div>
      </div>
      <div class="cpp-meta" *ngIf="record?.status">
        <p-tag [value]="record.status" [severity]="statusSeverity" />
        <span class="cpp-owner" *ngIf="record?.owner">{{ record.owner }}</span>
      </div>
      <div class="cpp-body">
        <div *ngFor="let section of visibleSections" class="cpp-section">
          <h4 class="cpp-section-title">{{ isAr ? section.label.ar : section.label.en }}</h4>
          <ng-content [select]="'[preview-section=' + section.id + ']'"></ng-content>
        </div>
        <div *ngIf="record?.description" class="cpp-section">
          <h4 class="cpp-section-title">{{ isAr ? 'وصف' : 'Description' }}</h4>
          <p class="cpp-desc">{{ record.description }}</p>
        </div>
      </div>
      <div class="cpp-footer">
        <button pButton [label]="isAr ? 'فتح السجل' : 'Open Record'" size="small"
                (click)="openDetail.emit(record)"></button>
      </div>
    </aside>
  `,
  styles: [`
    .canonical-preview { width: var(--shell-drawer-width, 480px); border-inline-start: 1px solid var(--surface-border, #e5e7eb); background: var(--surface-card, #fff); display: flex; flex-direction: column; height: 100%; }
    .cpp-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface-border, #e5e7eb); }
    .cpp-title { font-weight: 700; font-size: var(--font-size-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .cpp-actions { display: flex; gap: 4px; }
    .cpp-meta { display: flex; align-items: center; gap: 8px; padding: 8px 16px; }
    .cpp-owner { font-size: var(--font-size-sm); color: var(--text-muted); }
    .cpp-body { flex: 1; overflow-y: auto; padding: 16px; }
    .cpp-section { margin-bottom: 16px; }
    .cpp-section-title { margin: 0 0 8px; font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: var(--text-muted); }
    .cpp-desc { margin: 0; font-size: var(--font-size-base); line-height: 1.5; color: var(--text-body); }
    .cpp-footer { padding: 12px 16px; border-top: 1px solid var(--surface-border, #e5e7eb); }
  `],
})
export class CanonicalPreviewPanelComponent {
  private i18n = inject(I18nService);

  @Input() record: any;
  @Input() open = false;
  @Input() sections: PreviewSection[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() openDetail = new EventEmitter<any>();

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  get visibleSections(): PreviewSection[] {
    return this.sections.filter(s => s.visible).sort((a, b) => a.order - b.order);
  }

  get statusSeverity(): 'success' | 'info' | 'warning' | 'danger' | undefined {
    const s = this.record?.status?.toLowerCase();
    if (!s) return undefined;
    if (['active', 'approved', 'effective', 'published', 'closed'].includes(s)) return 'success';
    if (['draft', 'planned'].includes(s)) return 'info';
    if (['overdue', 'expired', 'stale'].includes(s)) return 'warning';
    if (['critical', 'rejected', 'failed', 'blocked'].includes(s)) return 'danger';
    return 'info';
  }
}
