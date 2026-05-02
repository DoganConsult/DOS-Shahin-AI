import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type LifecyclePhaseCode = 'plan' | 'assess' | 'design' | 'implement' | 'operate' | 'assure' | 'improve';

export interface LifecyclePhase {
  id: LifecyclePhaseCode;
  label?: string;
  labelAr?: string;
  moduleRoutes?: string[];
  [key: string]: any;
}

export const LIFECYCLE_PHASES: LifecyclePhase[] = [
  { id: 'plan' }, { id: 'assess' }, { id: 'design' }, { id: 'implement' },
  { id: 'operate' }, { id: 'assure' }, { id: 'improve' },
];

export interface LifecycleBarStage {
  code: string;
  label: string;
  labelAr: string;
  active: boolean;
  completed: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-lifecycle-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="lcb-bar" [attr.dir]="dir" [attr.aria-label]="dir === 'rtl' ? 'مراحل دورة الحياة' : 'Lifecycle stages'">
      @for (stage of stages; track stage.code; let i = $index) {
        <div
          class="lcb-step"
          [class.lcb-active]="stage.active"
          [class.lcb-completed]="stage.completed"
          [attr.aria-current]="stage.active ? 'step' : null"
        >
          <div class="lcb-indicator">
            @if (stage.completed) {
              <i class="pi pi-check"></i>
            } @else {
              <span>{{ i + 1 }}</span>
            }
          </div>
          <span class="lcb-label">{{ dir === 'rtl' ? stage.labelAr : stage.label }}</span>
        </div>
        @if (i < stages.length - 1) {
          <div class="lcb-connector" [class.lcb-connector-done]="stage.completed"></div>
        }
      }
    </nav>
  `,
  styles: [`
    .lcb-bar { display: flex; align-items: center; gap: 0; padding: 0.75rem 0; overflow-x: auto; }
    .lcb-step {
      display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;
      color: var(--text-muted); font-size: 0.8rem;
    }
    .lcb-indicator {
      width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--border); background: var(--bg-0); font-size: 0.75rem; font-weight: 600;
    }
    .lcb-active .lcb-indicator { border-color: var(--primary); color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); }
    .lcb-active .lcb-label { color: var(--text-body); font-weight: 600; }
    .lcb-completed .lcb-indicator { border-color: var(--success); background: var(--success); color: #fff; }
    .lcb-completed .lcb-label { color: var(--success); }
    .lcb-connector { width: 24px; height: 2px; background: var(--border); flex-shrink: 0; }
    .lcb-connector-done { background: var(--success); }
    .lcb-label { transition: color 0.2s; }
  `],
})
export class LifecycleBarComponent {
  @Input() stages: LifecycleBarStage[] = [];
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Input() activePhase: LifecyclePhase | null = null;
  @Input() pageTitle = '';
  @Output() phaseChange = new EventEmitter<LifecyclePhase>();
}
