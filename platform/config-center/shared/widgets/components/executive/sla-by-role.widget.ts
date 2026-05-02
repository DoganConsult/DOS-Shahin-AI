import {
  Component, ChangeDetectionStrategy, Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';

export interface SlaByRoleEntry {
  roleCode: string;
  roleName: string;
  roleNameAr: string;
  totalTasks: number;
  onTime: number;
  breached: number;
  atRisk: number;
  compliancePct: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-sla-by-role',
  standalone: true,
  imports: [CommonModule, TagModule],
  template: `
    <div class="wsr-widget" [attr.dir]="dir">
      <h4 class="wsr-title">{{ dir === 'rtl' ? 'SLA حسب الدور' : 'SLA by Role' }}</h4>
      @if (!entries?.length) {
        <p class="wsr-empty">{{ dir === 'rtl' ? 'لا توجد بيانات' : 'No SLA data available' }}</p>
      } @else {
        <ul class="wsr-list">
          @for (e of entries; track e.roleCode) {
            <li class="wsr-item">
              <span class="wsr-role">{{ dir === 'rtl' ? e.roleNameAr : e.roleName }}</span>
              <span class="wsr-stats">
                <span class="wsr-on-time">{{ e.onTime }}</span>
                <span class="wsr-sep">/</span>
                <span class="wsr-total">{{ e.totalTasks }}</span>
              </span>
              <p-tag
                [value]="e.compliancePct + '%'"
                [severity]="e.compliancePct >= 90 ? 'success' : e.compliancePct >= 70 ? 'warning' : 'danger'"
              />
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .wsr-widget { padding: 1rem; }
    .wsr-title { color: var(--text-body); margin: 0 0 0.75rem; font-size: var(--font-size-body-sm); }
    .wsr-empty { color: var(--text-muted); font-style: italic; font-size: var(--font-size-tag); }
    .wsr-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .wsr-item { display: flex; align-items: center; gap: 0.75rem; font-size: var(--font-size-tag); }
    .wsr-role { flex: 1; color: var(--text-body); }
    .wsr-stats { color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .wsr-on-time { color: var(--success); font-weight: 600; }
    .wsr-sep { opacity: 0.5; }
    .wsr-total { opacity: 0.7; }
  `],
})
export class SlaByRoleWidgetComponent {
  @Input() entries: SlaByRoleEntry[] = [];
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
}

export { SlaByRoleWidgetComponent as SlaByRoleWidget };
