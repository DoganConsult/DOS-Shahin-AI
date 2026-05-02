import { Component, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-widget-pain-mirror',
    imports: [CommonModule],
    template: `
    <div class="pm">
      <h4 class="pm-title">{{ i18n.translate('widgets.painMirror.title') }}</h4>
      <div tabindex="0" role="button" (keyup.enter)="select(i)" *ngFor="let p of pains; let i = index" class="pm-item" [class.selected]="selected === i" (click)="select(i)">
        <span class="pm-check">{{ selected === i ? '●' : '○' }}</span>
        <span class="pm-text">{{ i18n.translate('widgets.painMirror.pain' + i) }}</span>
      </div>
      <p class="pm-result" *ngIf="selected !== null">{{ i18n.translate('widgets.painMirror.response' + selected) }}</p>
    </div>
  `,
    styles: [`
    .pm { display: flex; flex-direction: column; gap: 6px; }
    .pm-title { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); margin: 0 0 4px; text-align: center; color: var(--text-heading); }
    .pm-item {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.04)); cursor: pointer; transition: all 200ms; font-size: var(--font-size-sm);
      border: 1px solid var(--glass-icon-border, rgba(var(--module-accent-sky-rgb), 0.08));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .pm-item:hover { border-color: rgba(var(--module-accent-blue-rgb), 0.25); }
    .pm-item.selected { background: rgba(var(--color-blue-50-rgb), 0.7); border-color: rgba(var(--module-accent-blue-rgb), 0.35); }
    .pm-check { font-size: var(--font-size-base); color: var(--primary, var(--primary)); min-width: 16px; }
    .pm-text { flex: 1; font-weight: 600; color: var(--text-body); }
    .pm-result {
      font-size: var(--font-size-sm); font-weight: 700; color: #1e40af; text-align: center; margin: 6px 0 0; padding: 10px;
      background: rgba(var(--color-blue-50-rgb), 0.6); border-radius: var(--radius-sm, 8px);
      border: 1px solid rgba(var(--module-accent-blue-rgb), 0.15);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
  `]
})
export class PainMirrorWidget {
  selected: number | null = null;
  pains = [
    { ar: 'لا نعرف من يملك أي ضبط', en: 'We don\'t know who owns which control' },
    { ar: 'نعرف، لكن الفرق لا تهتم', en: 'We know, but teams don\'t care' },
    { ar: 'نهتم، لكن المتطلبات غامضة', en: 'We care, but requirements are confusing' },
    { ar: 'نفهم، لكن كل شيء يدوي', en: 'We understand, but everything is manual' },
    { ar: 'نعمل، لكن الإدارة لا تراجع', en: 'We work, but leadership never reviews' },
  ];
  responses = [
    { ar: '→ المشكلة: نموذج تشغيلي (ملكية + RACI)', en: '→ Root cause: Operating model (ownership + RACI)' },
    { ar: '→ المشكلة: حوافز وثقافة', en: '→ Root cause: Incentives & culture' },
    { ar: '→ المشكلة: تعقيد تنظيمي وتفسير', en: '→ Root cause: Regulatory complexity & interpretation' },
    { ar: '→ المشكلة: أدوات وتجزئة البيانات', en: '→ Root cause: Tools & data fragmentation' },
    { ar: '→ المشكلة: حوكمة ضعيفة وقياس غائب', en: '→ Root cause: Weak governance & no measurement' },
  ];
  constructor(public i18n: I18nService) {}
  select(i: number) { this.selected = i; }

}
