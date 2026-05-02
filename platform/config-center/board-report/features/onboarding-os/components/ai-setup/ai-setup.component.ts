import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BilingualPipe } from '../shared/bilingual.pipe';

interface AutonomyLevel { code: string; labelEn: string; labelAr: string; descEn: string; descAr: string; icon: string; }
interface DataBoundary { code: string; labelEn: string; labelAr: string; icon: string; }

export interface AiSetupResult {
  autonomyLevel: string;
  dataBoundaries: string[];
}

@Component({
    selector: 'app-ai-setup',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, BilingualPipe],
    template: `
    <div class="ai-setup" [class.rtl]="lang === 'ar'">
      <div class="ai-setup-hero">
        <div class="hero-icon"><i class="pi pi-bolt"></i></div>
        <h2>{{ { en: 'Configure Your AI Operations', ar: 'إعداد عمليات الذكاء الاصطناعي' } | bilingual:lang }}</h2>
        <p class="hero-desc">
          {{ { en: '17+ AI agents, 50+ MCP tools, and 21+ temporal workers are ready to serve your organization. Set their operating boundaries.', ar: '17+ وكيل ذكاء اصطناعي و50+ أداة MCP و21+ عامل زمني جاهزون لخدمة مؤسستك. حدد حدود عملهم.' } | bilingual:lang }}
        </p>
      </div>

      <div class="ai-section">
        <h3>{{ { en: 'Agent Autonomy Level', ar: 'مستوى استقلالية الوكيل' } | bilingual:lang }}</h3>
        <div class="autonomy-cards">
          <button *ngFor="let level of autonomyLevels"
            class="autonomy-card"
            [class.selected]="selectedAutonomy() === level.code"
            (click)="selectAutonomy(level.code)"
            type="button">
            <div class="auto-icon"><i class="pi" [ngClass]="level.icon"></i></div>
            <h4>{{ { en: level.labelEn, ar: level.labelAr } | bilingual:lang }}</h4>
            <p>{{ { en: level.descEn, ar: level.descAr } | bilingual:lang }}</p>
            <div class="auto-check" *ngIf="selectedAutonomy() === level.code"><i class="pi pi-check"></i></div>
          </button>
        </div>
      </div>

      <div class="ai-section">
        <h3>{{ { en: 'AI Data Access Boundaries', ar: 'حدود وصول الذكاء الاصطناعي للبيانات' } | bilingual:lang }}</h3>
        <p class="section-hint">
          {{ { en: 'Select which data categories AI agents may access and analyze.', ar: 'حدد فئات البيانات التي يمكن لوكلاء الذكاء الاصطناعي الوصول إليها وتحليلها.' } | bilingual:lang }}
        </p>
        <div class="boundary-grid">
          <button *ngFor="let b of dataBoundaries"
            class="boundary-chip"
            [class.active]="selectedBoundaries().includes(b.code)"
            (click)="toggleBoundary(b.code)"
            type="button">
            <i class="pi" [ngClass]="b.icon"></i>
            <span>{{ { en: b.labelEn, ar: b.labelAr } | bilingual:lang }}</span>
          </button>
        </div>
      </div>

      <div class="ai-section">
        <h3>{{ { en: 'Agent Fleet Overview', ar: 'نظرة عامة على أسطول الوكلاء' } | bilingual:lang }}</h3>
        <div class="agent-stats">
          <div class="stat-card"><span class="stat-num">17+</span><span class="stat-label">{{ { en: 'AI Agents', ar: 'وكيل ذكاء' } | bilingual:lang }}</span></div>
          <div class="stat-card"><span class="stat-num">50+</span><span class="stat-label">{{ { en: 'MCP Tools', ar: 'أداة MCP' } | bilingual:lang }}</span></div>
          <div class="stat-card"><span class="stat-num">21+</span><span class="stat-label">{{ { en: 'Temporal Workers', ar: 'عامل زمني' } | bilingual:lang }}</span></div>
          <div class="stat-card"><span class="stat-num">20</span><span class="stat-label">{{ { en: 'Business Modules', ar: 'موديول أعمال' } | bilingual:lang }}</span></div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .ai-setup { max-width: 780px; display: flex; flex-direction: column; gap: 2rem; }
    .ai-setup-hero { text-align: center; margin-bottom: 0.5rem; }
    .hero-icon {
      width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 1rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center;
    }
    .hero-icon i { font-size: var(--font-size-2xl); color: #fff; }
    .ai-setup h2 { font-size: 1.4rem; font-weight: 700; margin: 0 0 0.5rem; }
    .hero-desc { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; max-width: 560px; margin: 0 auto; }
    .ai-section h3 { font-size: var(--font-size-md); font-weight: 700; margin: 0 0 0.75rem; }
    .section-hint { font-size: 0.82rem; color: var(--text-muted); margin: -0.5rem 0 0.75rem; }
    .autonomy-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .autonomy-card {
      position: relative; padding: 1.25rem; border-radius: var(--radius-md);
      border: 2px solid var(--border-subtle, #e5e7eb); background: var(--surface-card, #fff);
      cursor: pointer; text-align: left; transition: all 0.2s ease;
    }
    .autonomy-card:hover { border-color: var(--primary); }
    .autonomy-card.selected { border-color: var(--primary); background: rgba(var(--module-accent-indigo-rgb), 0.04); }
    .auto-icon { margin-bottom: 0.5rem; }
    .auto-icon i { font-size: var(--font-size-xl); color: var(--primary); }
    .autonomy-card h4 { font-size: 0.88rem; font-weight: 700; margin: 0 0 0.3rem; }
    .autonomy-card p { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.3; margin: 0; }
    .auto-check {
      position: absolute; top: 0.6rem; right: 0.6rem;
      width: 20px; height: 20px; border-radius: 50%; background: var(--primary);
      display: flex; align-items: center; justify-content: center;
    }
    .auto-check i { color: #fff; font-size: 0.6rem; }
    .boundary-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .boundary-chip {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem;
      border-radius: 20px; border: 1.5px solid var(--border-subtle, #e5e7eb);
      background: var(--surface-card, #fff); cursor: pointer; transition: all 0.15s ease;
      font-size: var(--font-size-caption); color: var(--text-primary);
    }
    .boundary-chip:hover { border-color: var(--primary); }
    .boundary-chip.active { border-color: var(--primary); background: rgba(var(--module-accent-indigo-rgb), 0.06); color: var(--primary); font-weight: 600; }
    .boundary-chip i { font-size: var(--font-size-tag); }
    .agent-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    .stat-card {
      text-align: center; padding: 1rem; border-radius: var(--radius-md);
      background: var(--surface-50, #f9fafb); border: 1px solid var(--border-subtle, #e5e7eb);
    }
    .stat-num { display: block; font-size: var(--font-size-2xl); font-weight: 800; color: var(--primary); }
    .stat-label { display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; }
    .rtl .autonomy-card, .rtl .ai-setup { text-align: right; }
    .rtl .auto-check { right: auto; left: 0.6rem; }
    @media (max-width: 768px) {
      .autonomy-cards { grid-template-columns: 1fr; }
      .agent-stats { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AiSetupComponent {
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() set initialAutonomy(v: string) { if (v) this.selectedAutonomy.set(v); }
  @Input() set initialBoundaries(v: string[]) { if (v?.length) this.selectedBoundaries.set(v); }
  @Output() configChanged = new EventEmitter<AiSetupResult>();

  selectedAutonomy = signal('supervised');
  selectedBoundaries = signal<string[]>(['controls', 'risks', 'policies']);

  autonomyLevels: AutonomyLevel[] = [
    { code: 'supervised', labelEn: 'Supervised', labelAr: 'مُشرف عليه', descEn: 'AI recommends, human approves every action.', descAr: 'الذكاء يوصي والإنسان يوافق على كل إجراء.', icon: 'pi-eye' },
    { code: 'assisted', labelEn: 'Assisted', labelAr: 'مُساعد', descEn: 'AI acts on routine, escalates exceptions.', descAr: 'الذكاء ينفذ الروتين ويصعّد الاستثناءات.', icon: 'pi-cog' },
    { code: 'autonomous', labelEn: 'Autonomous', labelAr: 'مستقل', descEn: 'AI operates independently with full audit trail.', descAr: 'الذكاء يعمل باستقلالية مع سجل تدقيق كامل.', icon: 'pi-bolt' },
  ];

  dataBoundaries: DataBoundary[] = [
    { code: 'controls', labelEn: 'Controls & Compliance', labelAr: 'الضوابط والامتثال', icon: 'pi-shield' },
    { code: 'risks', labelEn: 'Risk Register', labelAr: 'سجل المخاطر', icon: 'pi-exclamation-triangle' },
    { code: 'policies', labelEn: 'Policy Library', labelAr: 'مكتبة السياسات', icon: 'pi-file' },
    { code: 'evidence', labelEn: 'Evidence Vault', labelAr: 'خزنة الأدلة', icon: 'pi-folder' },
    { code: 'audit', labelEn: 'Audit Workpapers', labelAr: 'أوراق عمل التدقيق', icon: 'pi-search' },
    { code: 'incidents', labelEn: 'Incident Reports', labelAr: 'تقارير الحوادث', icon: 'pi-flag' },
    { code: 'vendors', labelEn: 'Vendor Data', labelAr: 'بيانات الموردين', icon: 'pi-link' },
    { code: 'hr', labelEn: 'People & HR Data', labelAr: 'بيانات الموظفين', icon: 'pi-users' },
  ];

  selectAutonomy(code: string) {
    this.selectedAutonomy.set(code);
    this.emitChange();
  }

  toggleBoundary(code: string) {
    const current = this.selectedBoundaries();
    this.selectedBoundaries.set(
      current.includes(code) ? current.filter(c => c !== code) : [...current, code]
    );
    this.emitChange();
  }

  private emitChange() {
    this.configChanged.emit({ autonomyLevel: this.selectedAutonomy(), dataBoundaries: this.selectedBoundaries() });
  }
}
