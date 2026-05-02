import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilingualPipe } from '../shared/bilingual.pipe';

interface Phase {
  code: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  stages: string[];
}

@Component({
    selector: 'app-three-phase-progress',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, BilingualPipe],
    template: `
    <div class="three-phase" [class.rtl]="lang === 'ar'">
      <div *ngFor="let phase of phases; let i = index; let last = last"
        class="phase-item"
        [class.active]="currentPhaseIndex === i"
        [class.completed]="currentPhaseIndex > i">
        <div class="phase-dot">
          <i class="pi" [ngClass]="currentPhaseIndex > i ? 'pi-check' : phase.icon"></i>
        </div>
        <span class="phase-label">{{ { en: phase.labelEn, ar: phase.labelAr } | bilingual:lang }}</span>
        <div class="phase-connector" *ngIf="!last"></div>
      </div>
    </div>
  `,
    styles: [`
    .three-phase { display: flex; align-items: center; justify-content: center; gap: 0; padding: 0.75rem 0; }
    .phase-item { display: flex; align-items: center; gap: 0.4rem; position: relative; }
    .phase-dot {
      width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--border-subtle, #e5e7eb); background: var(--surface-card, #fff);
      transition: all 0.3s ease;
    }
    .phase-dot i { font-size: var(--font-size-tag); color: var(--text-muted); }
    .phase-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); transition: color 0.3s; }
    .phase-connector { width: 48px; height: 2px; background: var(--border-subtle, #e5e7eb); margin: 0 0.5rem; transition: background 0.3s; }
    .phase-item.active .phase-dot { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.08); }
    .phase-item.active .phase-dot i { color: var(--primary); }
    .phase-item.active .phase-label { color: var(--primary); font-weight: 700; }
    .phase-item.completed .phase-dot { border-color: #059669; background: #059669; }
    .phase-item.completed .phase-dot i { color: #fff; }
    .phase-item.completed .phase-label { color: #059669; }
    .phase-item.completed + .phase-item .phase-connector,
    .phase-item.completed .phase-connector { background: #059669; }
    .rtl .three-phase { direction: rtl; }
  `]
})
export class ThreePhaseProgressComponent {
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() activeStageCode: string = '';

  phases: Phase[] = [
    { code: 'discovery', labelEn: 'Discovery', labelAr: 'الاكتشاف', icon: 'pi-compass',
      stages: ['welcome', 'registration', 'organization_identity', 'use_case', 'pain_profile'] },
    { code: 'configuration', labelEn: 'Configuration', labelAr: 'الإعداد', icon: 'pi-cog',
      stages: ['pack_selection', 'regulatory_scope', 'org_structure', 'people_ownership', 'technology_landscape', 'governance_model', 'risk_compliance_maturity', 'operating_model', 'data_start_mode', 'ai_setup', 'personalization'] },
    { code: 'activation', labelEn: 'Activation', labelAr: 'التفعيل', icon: 'pi-bolt',
      stages: ['readiness_check', 'review_confirmation', 'provision_workspace'] },
  ];

  get currentPhaseIndex(): number {
    if (!this.activeStageCode) return 0;
    const idx = this.phases.findIndex(p => p.stages.includes(this.activeStageCode));
    return idx >= 0 ? idx : 0;
  }
}
