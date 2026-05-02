import { Component, inject, OnInit, ChangeDetectionStrategy, DestroyRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface LogEntry { agent: string; action: string; time: string; color: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-showcase-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ec-section" id="engine-console">
      <div class="ec-container">
        <div class="ec-header">
          <div class="ec-badge"><i class="pi pi-microchip-ai"></i> {{ i18n.translate('landing.widgetShowcase.badge') }}</div>
          <h2 class="ec-title">{{ i18n.translate('landing.widgetShowcase.title') }}</h2>
          <p class="ec-sub">{{ i18n.translate('landing.widgetShowcase.subtitle') }}</p>
        </div>

        <div class="ec-console">
          <!-- Console chrome -->
          <div class="ec-chrome">
            <div class="ec-dots"><span class="d r"></span><span class="d y"></span><span class="d g"></span></div>
            <span class="ec-label">shahin-ai-engine ~/autonomous-cycles</span>
            <div class="ec-live"><span class="ec-pulse"></span>LIVE</div>
          </div>

          <!-- Console body -->
          <div class="ec-body">
            <div class="ec-line ec-boot">
              <span class="ec-ts">00:00:00</span>
              <span class="ec-agent ec-sys">KERNEL</span>
              <span class="ec-msg">Shahin-AI v3.2 booted — 12 agents initialized, 60+ frameworks loaded</span>
            </div>
            @for (log of visibleLogs; track $index) {
              <div class="ec-line" [class.ec-new]="log === visibleLogs[visibleLogs.length - 1]">
                <span class="ec-ts">{{ log.time }}</span>
                <span class="ec-agent" [style.color]="log.color">{{ log.agent }}</span>
                <span class="ec-msg">{{ log.action }}</span>
              </div>
            }
            <div class="ec-cursor">_</div>
          </div>

          <!-- Agent status bar -->
          <div class="ec-agents-bar">
            @for (a of agentStatus; track a.id) {
              <div class="ea-chip" [class.ea-active]="a.active">
                <span class="ea-dot" [style.background]="a.active ? 'var(--success)' : '#475569'"></span>
                <span class="ea-id">{{ a.id }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Stats under console -->
        <div class="ec-stats">
          <div class="es-card">
            <span class="es-num">24/7</span>
            <span class="es-label">{{ i18n.translate('landing.widgetShowcase.alwaysRunning') }}</span>
          </div>
          <div class="es-card">
            <span class="es-num">0</span>
            <span class="es-label">{{ i18n.translate('landing.widgetShowcase.humanIntervention') }}</span>
          </div>
          <div class="es-card">
            <span class="es-num">10</span>
            <span class="es-label">{{ i18n.translate('landing.widgetShowcase.parallelAgents') }}</span>
          </div>
          <div class="es-card">
            <span class="es-num">&lt;2s</span>
            <span class="es-label">{{ i18n.translate('landing.widgetShowcase.responseTime') }}</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .ec-section {
      padding: 80px 0; overflow: hidden;
      background: #0a1628;
    }
    .ec-container { max-width: 1024px; margin: 0 auto; padding: 0 24px; }
    .ec-header { text-align: center; margin-bottom: 40px; }
    .ec-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 20px; border-radius: var(--radius-pill);
      background: rgba(var(--module-accent-sky-rgb), 0.1); border: 1px solid rgba(var(--module-accent-sky-rgb), 0.25);
      color: #38bdf8; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 20px;
    }
    .ec-badge .pi { font-size: var(--font-size-sm); }
    .ec-title { font-size: clamp(24px, 4vw, 36px); font-weight: 900; color: var(--surface-ice); margin: 0 0 14px; letter-spacing: -0.02em; }
    .ec-sub { font-size: var(--font-size-base); color: rgba(var(--color-white-rgb), 0.5); max-width: 600px; margin: 0 auto; line-height: 1.7; }

    /* Console */
    .ec-console {
      border-radius: var(--radius-lg); overflow: hidden;
      border: 1px solid rgba(var(--color-white-rgb), 0.08);
      box-shadow: 0 20px 60px rgba(var(--color-black-rgb), 0.4);
    }
    .ec-chrome {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: var(--text-heading);
      border-bottom: 1px solid rgba(var(--color-white-rgb), 0.06);
    }
    .ec-dots { display: flex; gap: 5px; }
    .d { width: 8px; height: 8px; border-radius: var(--radius-pill); }
    .r { background: var(--error); }
    .y { background: var(--warning); }
    .g { background: var(--success); }
    .ec-label { flex: 1; font-size: var(--font-size-xs); color: #64748b; font-family: 'IBM Plex Mono', monospace; }
    .ec-live { display: flex; align-items: center; gap: 5px; font-size: var(--font-size-xs); font-weight: 700; color: var(--success); letter-spacing: 0.1em; }
    .ec-pulse { width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--success); box-shadow: 0 0 6px var(--success); animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

    .ec-body {
      background: var(--text-heading); padding: 16px; min-height: 220px;
      font-family: 'IBM Plex Mono', monospace; font-size: var(--font-size-sm);
      overflow-y: auto; max-height: 300px;
    }
    .ec-line {
      display: flex; gap: 10px; padding: 3px 0;
      color: rgba(var(--color-white-rgb), 0.6); line-height: 1.6;
    }
    .ec-line.ec-boot { color: var(--success); margin-bottom: 4px; }
    .ec-line.ec-new { animation: fadeIn 400ms ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .ec-ts { color: #475569; min-width: 64px; flex-shrink: 0; }
    .ec-agent { font-weight: 700; min-width: 44px; flex-shrink: 0; }
    .ec-sys { color: var(--success); }
    .ec-msg { color: rgba(var(--color-white-rgb), 0.7); }
    .ec-cursor { color: var(--primary); animation: blink 1s step-end infinite; }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }

    /* Agent status bar */
    .ec-agents-bar {
      display: flex; gap: 6px; padding: 10px 14px; flex-wrap: wrap;
      background: var(--text-heading); border-top: 1px solid rgba(var(--color-white-rgb), 0.06);
    }
    .ea-chip {
      display: flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: var(--radius-sm);
      background: rgba(var(--color-white-rgb), 0.04); font-size: var(--font-size-xs); font-weight: 700;
      color: #64748b; font-family: 'IBM Plex Mono', monospace;
    }
    .ea-chip.ea-active { color: var(--border-subtle); background: rgba(var(--module-accent-green-rgb), 0.1); }
    .ea-dot { width: 5px; height: 5px; border-radius: var(--radius-pill); }

    /* Stats */
    .ec-stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      margin-top: 24px;
    }
    .es-card {
      text-align: center; padding: 16px; border-radius: var(--radius-md);
      background: rgba(var(--color-white-rgb), 0.03); border: 1px solid rgba(var(--color-white-rgb), 0.06);
    }
    .es-num { display: block; font-size: var(--font-size-2xl); font-weight: 900; color: var(--surface-ice); }
    .es-label { display: block; font-size: var(--font-size-xs); color: var(--text-muted); font-weight: 600; margin-top: 4px; }

    @media (max-width: 768px) {
      .ec-stats { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class WidgetShowcaseSectionComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);

  visibleLogs: LogEntry[] = [];
  private logIdx = 0;

  agentStatus = [
    { id: 'A01', active: true }, { id: 'A02', active: true },
    { id: 'A03', active: true }, { id: 'A04', active: true },
    { id: 'A05', active: true }, { id: 'A06', active: false },
    { id: 'A07', active: true }, { id: 'A08', active: true },
    { id: 'A09', active: false }, { id: 'A10', active: true },
  ];

  private allLogs: LogEntry[] = [
    { agent: 'A03', action: 'Mapped NCA ECC → ISO 27001 cross-framework (114 controls)', time: '00:00:02', color: '#3b82f6' },
    { agent: 'A05', action: 'Evidence collected: firewall-config-q4.pdf → SHA256 verified', time: '00:00:05', color: '#10b981' },
    { agent: 'A07', action: 'Risk scored: "Unpatched servers" → 4×4 = 16 (Critical)', time: '00:00:08', color: '#f59e0b' },
    { agent: 'A04', action: 'Control authored: AC-2.3 "MFA enforcement" with test procedure', time: '00:00:12', color: '#8b5cf6' },
    { agent: 'A08', action: 'Policy v3 drafted: "Data Classification Policy" → pending approval', time: '00:00:15', color: '#ec4899' },
    { agent: 'A10', action: 'Audit report generated: NCA ECC Board Summary (PDF + Excel)', time: '00:00:18', color: '#06b6d4' },
    { agent: 'A01', action: 'New tenant onboarded: sector=Finance, regulators=[SAMA, NCA]', time: '00:00:22', color: '#22c55e' },
    { agent: 'A06', action: 'Gap remediation: 3 critical findings → action plans created', time: '00:00:25', color: '#ef4444' },
    { agent: 'A02', action: 'RACI assigned: 4 control owners across Risk & Compliance teams', time: '00:00:28', color: '#14b8a6' },
    { agent: 'A09', action: 'Vendor risk assessed: CloudProvider-X → Medium (SLA monitored)', time: '00:00:31', color: '#f97316' },
    { agent: 'A03', action: 'Cross-mapping saved 62% effort: 1 control → 4 frameworks', time: '00:00:34', color: '#3b82f6' },
    { agent: 'A05', action: 'Evidence freshness check: 12 items expiring in 30 days', time: '00:00:37', color: '#10b981' },
    { agent: 'A07', action: 'KRI alert: "Incident response time" exceeded threshold', time: '00:00:40', color: '#f59e0b' },
    { agent: 'A04', action: 'Test procedure linked to 8 controls across NCA & SAMA', time: '00:00:43', color: '#8b5cf6' },
    { agent: 'A10', action: 'Interactive HTML report: PDPL DPIA assessment ready', time: '00:00:46', color: '#06b6d4' },
  ];

  ngOnInit(): void {
    this.visibleLogs = this.allLogs.slice(0, 4);
    this.logIdx = 4;
    interval(3000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.addLog());
  }

  private addLog(): void {
    if (this.logIdx >= this.allLogs.length) this.logIdx = 0;
    this.visibleLogs = [...this.visibleLogs.slice(-8), this.allLogs[this.logIdx]];
    this.logIdx++;
    // Randomly toggle an agent status
    const idx = Math.floor(Math.random() * this.agentStatus.length);
    this.agentStatus[idx].active = !this.agentStatus[idx].active;
    setTimeout(() => { this.agentStatus[idx].active = true; }, 1500);
  }
}
