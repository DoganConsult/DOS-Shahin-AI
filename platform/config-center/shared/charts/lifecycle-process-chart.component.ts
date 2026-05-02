import {
  Component, ChangeDetectionStrategy, Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';

export interface LifecycleTransitionInput {
  from: string;
  to: string;
  fromStage?: string;
  toStage?: string;
  reason?: string;
  approvedBy?: string;
  requiresApproval?: boolean;
}

export interface LifecycleStage {
  code: string;
  label: string;
  labelAr: string;
  count: number;
  color: string;
}

export interface LifecycleTransitionInput {
  from: string;
  to: string;
  label?: string;
  labelAr?: string;
  count?: number;
  color?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-lifecycle-process-chart',
  standalone: true,
  imports: [CommonModule, TagModule],
  template: `
    <div class="lpc-chart" [attr.dir]="dir">
      @if (!stages?.length) {
        <p class="lpc-empty">{{ dir === 'rtl' ? 'لا توجد مراحل' : 'No stages defined' }}</p>
      } @else {
        <div class="lpc-bar">
          @for (s of stages; track s.code) {
            <div
              class="lpc-segment"
              [style.flex]="s.count"
              [style.background]="s.color"
              [title]="s.label + ': ' + s.count"
            >
              <span class="lpc-label">{{ dir === 'rtl' ? s.labelAr : s.label }}</span>
              <span class="lpc-count">{{ s.count }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .lpc-chart { padding: 0.5rem 0; }
    .lpc-bar { display: flex; border-radius: var(--radius-sm); overflow: hidden; min-height: 36px; }
    .lpc-segment {
      display: flex; align-items: center; justify-content: center; gap: 0.25rem;
      color: #fff; font-size: var(--font-size-sm); font-weight: 600; padding: 0 0.5rem;
      min-width: 40px; transition: flex 0.3s ease;
    }
    .lpc-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lpc-count { opacity: 0.85; }
    .lpc-empty { color: var(--text-muted); font-style: italic; }
  `],
})
export class LifecycleProcessChartComponent {
  @Input() stages: LifecycleStage[] = [];
  @Input() transitions: LifecycleTransitionInput[] = [];
  @Input() label = '';
  @Input() currentStatus?: string;
  @Input() height = 'auto';
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
}
