import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Journey phases in order */
export type JourneyPhase = 'setup' | 'foundation' | 'assessment' | 'implementation' | 'operations' | 'continuous_improvement';

export interface PhaseItem {
  id: JourneyPhase;
  labelEn: string;
  labelAr: string;
  icon: string;
  route: string;
}

export const JOURNEY_PHASES: PhaseItem[] = [
  { id: 'setup', labelEn: 'Setup', labelAr: 'الإعداد', icon: 'pi-cog', route: '/journey/setup' },
  { id: 'foundation', labelEn: 'Foundation', labelAr: 'التأسيس', icon: 'pi-building', route: '/journey/roadmap' },
  { id: 'assessment', labelEn: 'Assessment', labelAr: 'التقييم', icon: 'pi-search', route: '/journey/roadmap' },
  { id: 'implementation', labelEn: 'Implementation', labelAr: 'التنفيذ', icon: 'pi-wrench', route: '/journey/roadmap' },
  { id: 'operations', labelEn: 'Operations', labelAr: 'العمليات', icon: 'pi-sync', route: '/journey/roadmap' },
  { id: 'continuous_improvement', labelEn: 'Continuous Improvement', labelAr: 'التحسين المستمر', icon: 'pi-chart-line', route: '/journey/maturity' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-journey',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="journey-shell">
      <!-- Phase navigation bar -->
      <nav class="phase-nav" role="navigation" [attr.aria-label]="i18n.translate('journey.phases')">
        <div class="phase-nav-top">
          <a routerLink="/workspace-home" class="btn-back">{{ i18n.translate('journey.backHome') }}</a>
        </div>
        <div class="phase-track">
          @for (phase of phases; track phase.id; let idx = $index) {
            <a class="phase-step"
               [routerLink]="phase.route"
               [class.active]="currentPhaseIndex === idx"
               [class.completed]="idx < currentPhaseIndex"
               [attr.aria-current]="currentPhaseIndex === idx ? 'step' : null">
              <span class="phase-icon">
                <i class="pi" [ngClass]="idx < currentPhaseIndex ? 'pi-check' : phase.icon"></i>
              </span>
              <span class="phase-label">{{ i18n.translate('journey.phase.' + phase.id) }}</span>
            </a>
            @if (idx < phases.length - 1) {
              <span class="phase-connector" [class.completed]="idx < currentPhaseIndex"></span>
            }
          }
        </div>
      </nav>

      <!-- Child route content -->
      <main class="journey-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .journey-shell {
      min-height: 100vh;
      background: var(--surface-sunken);
    }

    .phase-nav {
      position: sticky;
      top: 0;
      z-index: var(--z-base);
      background: var(--surface);
      border-bottom: 1px solid var(--border-subtle);
      padding: var(--space-md) var(--space-lg);
      box-shadow: var(--shadow-sm);
    }

    .phase-nav-top {
      display: flex;
      justify-content: flex-start;
      margin-bottom: var(--space-sm);
    }

    .btn-back {
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text-muted);
      text-decoration: none;
      font-size: var(--font-size-tag);
    }

    .btn-back:hover {
      color: var(--primary);
      background: var(--surface-ice);
    }

    .phase-track {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      max-width: 900px;
      margin: 0 auto;
    }

    .phase-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-xs);
      text-decoration: none;
      color: var(--text-muted);
      transition: all 200ms ease;
      padding: var(--space-xs) var(--space-sm);
      cursor: pointer;
    }

    .phase-step:hover {
      color: var(--primary);
    }

    .phase-step.active {
      color: var(--primary);
    }

    .phase-step.completed {
      color: var(--success);
    }

    .phase-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-pill);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-base);
      border: 2px solid var(--border-subtle);
      background: var(--surface);
      transition: all 200ms ease;
    }

    .phase-step.active .phase-icon {
      border-color: var(--primary);
      background: var(--surface-ice);
      color: var(--primary);
      box-shadow: 0 0 0 4px rgba(var(--module-accent-sky-rgb), 0.12);
    }

    .phase-step.completed .phase-icon {
      border-color: var(--success);
      background: var(--success);
      color: var(--text-on-primary);
    }

    .phase-label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-medium);
      white-space: nowrap;
    }

    .phase-connector {
      flex: 0 0 24px;
      height: 2px;
      background: var(--border-subtle);
      margin: 0 2px;
      margin-bottom: 20px;
      transition: background 200ms ease;
    }

    .phase-connector.completed {
      background: var(--success);
    }

    .journey-content {
      max-width: 900px;
      margin: 0 auto;
      padding: var(--space-lg);
    }

    @media (max-width: 768px) {
      .phase-track {
        overflow-x: auto;
        justify-content: flex-start;
        padding-bottom: var(--space-xs);
      }
      .phase-label {
        font-size: var(--font-size-xs);
      }
      .phase-icon {
        width: 28px;
        height: 28px;
        font-size: var(--font-size-sm);
      }
      .phase-connector {
        flex: 0 0 12px;
      }
    }
  `],
})
export class JourneyComponent {
  i18n = inject(I18nService);
  private router = inject(Router);

  phases = JOURNEY_PHASES;
  currentPhaseIndex = 0;

  /** Update current phase index based on external state (will be wired in task 13.2+) */
  setCurrentPhase(phase: JourneyPhase): void {
    const idx = this.phases.findIndex(p => p.id === phase);
    if (idx >= 0) this.currentPhaseIndex = idx;
  }
}
