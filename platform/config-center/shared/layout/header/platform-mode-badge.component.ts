import { Component, inject, signal, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { PlatformModeService, PLATFORM_MODES, PlatformMode } from '@app/core/services/platform/platform-mode.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-platform-mode-badge',
    imports: [CommonModule, TooltipModule, DialogModule],
    template: `
    <div class="mode-badge-wrap">
      <!-- Collapsed: icon only -->
      <button
        class="mode-badge"
        [class.mode-badge--collapsed]="collapsed"
        [attr.data-mode]="modeService.currentMode()"
        [pTooltip]="collapsed
          ? (i18n.translate('platformMode.modeLabel') + ': ' + i18n.localize(modeService.currentConfig().label, modeService.currentConfig().labelAr))
          : i18n.translate('platformMode.clickToChange')"
        tooltipPosition="right"
        (click)="openDialog()"
        [attr.aria-label]="i18n.translate('platformMode.changeMode')">
        <i class="pi" [ngClass]="modeService.currentConfig().icon"
           [style.color]="modeService.currentConfig().color"></i>
        <ng-container *ngIf="!collapsed">
          <span class="mode-badge__label" [style.color]="modeService.currentConfig().color">
            {{ i18n.translate('platformMode.modeLabel') }}: {{ i18n.localize(modeService.currentConfig().label, modeService.currentConfig().labelAr) }}
          </span>
          <span *ngIf="modeService.pendingActionsCount() > 0" class="mode-badge__pending">
            {{ modeService.pendingActionsCount() }}
          </span>
          <i class="pi pi-chevron-up mode-badge__caret"></i>
        </ng-container>
      </button>

      <!-- Mode selection dialog -->
      <p-dialog
        [(visible)]="dialogVisible"
        [modal]="true"
        [closable]="true"
        [draggable]="false"
        [style]="{ width: '560px', 'max-height': '85vh' }"
        [header]="i18n.translate('platformMode.dialogTitle')">
        <div class="mode-dialog-body">
          <p class="mode-dialog-intro">
            {{ i18n.translate('platformMode.intro') }}
          </p>

          <div class="mode-options">
            <button
              *ngFor="let cfg of modes"
              class="mode-option"
              [class.active]="modeService.currentMode() === cfg.mode"
              [class.disabled]="!modeService.canSetMode(cfg.mode)"
              [disabled]="!modeService.canSetMode(cfg.mode)"
              (click)="selectMode(cfg.mode)"
              [attr.aria-pressed]="modeService.currentMode() === cfg.mode">
              <div class="mode-option__icon-wrap" [style.background]="cfg.color + '20'">
                <i class="pi" [ngClass]="cfg.icon" [style.color]="cfg.color"></i>
              </div>
              <div class="mode-option__text">
                <span class="mode-option__name" [style.color]="modeService.currentMode() === cfg.mode ? cfg.color : ''">
                  {{ i18n.localize(cfg.label, cfg.labelAr) }}
                </span>
                <span class="mode-option__desc">
                  {{ i18n.localize(cfg.description, cfg.descriptionAr) }}
                </span>
                <span class="mode-option__level">
                  {{ i18n.translate('platformMode.agentLevel') }}: {{ cfg.agentLevelRange[0] }}–{{ cfg.agentLevelRange[1] }}
                </span>
              </div>
              <i *ngIf="modeService.currentMode() === cfg.mode" class="pi pi-check mode-option__check" [style.color]="cfg.color"></i>
              <span *ngIf="cfg.requiresRole.length > 0 && !modeService.canSetMode(cfg.mode)" class="mode-option__locked">
                <i class="pi pi-lock"></i>
              </span>
            </button>
          </div>

          <div class="mode-agents-section" *ngIf="modeService.agentRoles().length > 0">
            <h4 class="mode-agents-title">
              {{ i18n.translate('platformMode.agentsTitle') }}
            </h4>
            <p class="mode-agents-subtitle">
              {{ i18n.translate('platformMode.agentsSubtitle') }}
            </p>
            <div class="mode-agents-grid">
              <div *ngFor="let agent of modeService.agentRoles()" class="mode-agent-chip"
                   [class.mode-agent-chip--active]="agentHasRuns(agent.agentId)">
                <div class="mode-agent-icon-wrap" [style.background]="agent.color + '15'">
                  <i class="pi" [ngClass]="agent.icon" [style.color]="agent.color"></i>
                </div>
                <div class="mode-agent-info">
                  <span class="mode-agent-name">{{ agent.agentId }}</span>
                  <span class="mode-agent-role">{{ i18n.localize(agent.grcRole, agent.grcRoleAr) }}</span>
                  <span class="mode-agent-domain">{{ i18n.localize(agent.domain, agent.domainAr) }}</span>
                </div>
                <span *ngIf="getAgentRunCount(agent.agentId) > 0" class="mode-agent-runs">
                  {{ getAgentRunCount(agent.agentId) }}
                </span>
              </div>
            </div>
          </div>

          <div class="mode-stats-section" *ngIf="modeService.runStats()">
            <h4 class="mode-agents-title">
              {{ i18n.translate('platformMode.orchStats') }}
            </h4>
            <div class="mode-stats-grid">
              <div class="mode-stat-card">
                <span class="mode-stat-value">{{ modeService.runStats()!.totalRuns }}</span>
                <span class="mode-stat-label">{{ i18n.translate('platformMode.totalRuns') }}</span>
              </div>
              <div class="mode-stat-card">
                <span class="mode-stat-value" style="color: #10b981">{{ modeService.runStats()!.completedRuns }}</span>
                <span class="mode-stat-label">{{ i18n.translate('platformMode.completed') }}</span>
              </div>
              <div class="mode-stat-card">
                <span class="mode-stat-value" style="color: #f59e0b">{{ modeService.runStats()!.runningRuns }}</span>
                <span class="mode-stat-label">{{ i18n.translate('platformMode.running') }}</span>
              </div>
              <div class="mode-stat-card">
                <span class="mode-stat-value" style="color: #3b82f6">{{ modeService.runStats()!.totalActions }}</span>
                <span class="mode-stat-label">{{ i18n.translate('platformMode.actionsExecuted') }}</span>
              </div>
            </div>
          </div>

          <div class="mode-pending-section" *ngIf="modeService.pendingActionsCount() > 0 || (modeService.runStats()?.pendingProposals ?? 0) > 0">
            <div class="mode-pending-banner">
              <i class="pi pi-inbox"></i>
              <span>
                {{ modeService.pendingActionsCount() + (modeService.runStats()?.pendingProposals ?? 0) }}
                {{ i18n.translate('platformMode.awaitingApproval') }}
              </span>
            </div>
          </div>

          <div class="mode-autonomy-section">
            <h4 class="mode-agents-title">
              {{ i18n.translate('platformMode.autonomyMatrix') }}
            </h4>
            <div class="mode-autonomy-grid">
              <div class="mode-autonomy-row" *ngFor="let level of autonomyLevels">
                <span class="mode-autonomy-level" [style.color]="level.color">{{ level.code }}</span>
                <span class="mode-autonomy-name">{{ i18n.localize(level.name, level.nameAr) }}</span>
                <span class="mode-autonomy-desc">{{ i18n.localize(level.desc, level.descAr) }}</span>
              </div>
            </div>
          </div>

          <div class="mode-memory-section" *ngIf="modeService.memoryStats()">
            <h4 class="mode-agents-title">
              <i class="pi pi-database" style="margin-inline-end: 6px; font-size: var(--font-size-sm)"></i>
              {{ i18n.translate('platformMode.agentMemory') }}
            </h4>
            <p class="mode-agents-subtitle">
              {{ i18n.translate('platformMode.memorySubtitle') }}
            </p>
            <div class="mode-stats-grid">
              <div class="mode-stat-card">
                <span class="mode-stat-value" style="color: var(--primary)">{{ modeService.memoryStats()!.total }}</span>
                <span class="mode-stat-label">{{ i18n.translate('platformMode.totalMemories') }}</span>
              </div>
              <div class="mode-stat-card">
                <span class="mode-stat-value" style="color: #10b981">{{ modeService.memoryStats()!.byType['personal'] || 0 }}</span>
                <span class="mode-stat-label">{{ i18n.translate('platformMode.personal') }}</span>
              </div>
              <div class="mode-stat-card">
                <span class="mode-stat-value" style="color: #3b82f6">{{ modeService.memoryStats()!.byType['task'] || 0 }}</span>
                <span class="mode-stat-label">{{ i18n.translate('platformMode.task') }}</span>
              </div>
              <div class="mode-stat-card">
                <span class="mode-stat-value" style="color: #f59e0b">{{ modeService.memoryStats()!.recentCommits }}</span>
                <span class="mode-stat-label">{{ i18n.translate('platformMode.commits24h') }}</span>
              </div>
            </div>
          </div>
        </div>
      </p-dialog>
    </div>
  `,
    styles: [`
    .mode-badge-wrap { width: 100%; }

    .mode-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 150ms;
    }
    .mode-badge:hover { background: var(--surface-ice, #f0f4f8); }
    .mode-badge--collapsed { justify-content: center; padding: 8px; }

    .mode-badge .pi { font-size: var(--font-size-base); width: 20px; height: 20px; line-height: 20px; text-align: center; flex-shrink: 0; overflow: hidden; }
    .mode-badge__label {
      flex: 1;
      font-size: var(--font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: start;
    }
    .mode-badge__caret { font-size: var(--font-size-xs); color: var(--text-muted); }
    .mode-badge__pending {
      background: var(--error);
      color: #fff;
      font-size: var(--font-size-xs);
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      line-height: 18px;
      border-radius: var(--radius);
      text-align: center;
      padding: 0 5px;
      flex-shrink: 0;
    }

    /* Dialog */
    .mode-dialog-body { padding: 4px 0 8px; }
    .mode-dialog-intro {
      font-size: var(--font-size-sm);
      color: var(--text-muted, var(--text-muted));
      margin: 0 0 16px;
    }
    .mode-options { display: flex; flex-direction: column; gap: 8px; }

    .mode-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-md);
      background: transparent;
      cursor: pointer;
      transition: border-color 150ms, background 150ms;
      text-align: start;
      width: 100%;
    }
    .mode-option:hover:not(.disabled) {
      background: var(--surface-ice, var(--surface-ice));
      border-color: var(--primary-light, #bfdbfe);
    }
    .mode-option.active { border-color: currentColor; background: var(--surface-ice, var(--surface-ice)); }
    .mode-option.disabled { opacity: 0.45; cursor: not-allowed; }

    .mode-option__icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mode-option__icon-wrap .pi { font-size: var(--font-size-lg); }

    .mode-option__text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .mode-option__name { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .mode-option__desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); line-height: 1.4; }
    .mode-option__level { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }

    .mode-option__check { font-size: var(--font-size-base); flex-shrink: 0; align-self: center; }
    .mode-option__locked { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); align-self: center; }

    .mode-agents-section { margin-top: 16px; border-top: 1px solid var(--border-subtle, var(--border-subtle)); padding-top: 12px; }
    .mode-agents-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading, var(--text-heading)); margin: 0 0 8px; }
    .mode-agents-subtitle { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin: 0 0 10px; line-height: 1.4; }
    .mode-agents-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .mode-agent-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 8px; border-radius: var(--radius);
      background: var(--surface-ice, var(--surface-ice));
      border: 1px solid transparent;
      font-size: var(--font-size-xs);
      transition: border-color 150ms;
    }
    .mode-agent-chip--active { border-color: var(--primary-light, #bfdbfe); }
    .mode-agent-icon-wrap {
      width: 28px; height: 28px; border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .mode-agent-icon-wrap .pi { font-size: var(--font-size-sm); }
    .mode-agent-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .mode-agent-name { font-weight: 700; color: var(--text-heading, var(--text-heading)); font-size: var(--font-size-xs); }
    .mode-agent-role { color: var(--text-muted, var(--text-muted)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: var(--font-size-xs); }
    .mode-agent-domain { color: var(--text-muted, var(--text-muted)); font-size: var(--font-size-xs); }
    .mode-agent-runs {
      background: var(--primary); color: #fff; font-size: var(--font-size-xs); font-weight: 700;
      min-width: 16px; height: 16px; line-height: 16px; border-radius: var(--radius);
      text-align: center; padding: 0 4px; flex-shrink: 0;
    }

    .mode-stats-section { margin-top: 12px; border-top: 1px solid var(--border-subtle, var(--border-subtle)); padding-top: 12px; }
    .mode-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .mode-stat-card {
      display: flex; flex-direction: column; align-items: center;
      padding: 8px 4px; border-radius: var(--radius);
      background: var(--surface-ice, var(--surface-ice));
    }
    .mode-stat-value { font-size: var(--font-size-lg); font-weight: 800; color: var(--text-heading, var(--text-heading)); }
    .mode-stat-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-align: center; margin-top: 2px; }

    .mode-pending-section { margin-top: 12px; }
    .mode-pending-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: var(--radius);
      background: var(--status-danger-bg, #fff1f1); color: #991b1b;
      font-size: var(--font-size-sm); font-weight: 600;
    }
    .mode-pending-banner .pi { font-size: var(--font-size-base); }

    .mode-memory-section { margin-top: 12px; border-top: 1px solid var(--border-subtle, var(--border-subtle)); padding-top: 12px; }

    .mode-autonomy-section { margin-top: 12px; border-top: 1px solid var(--border-subtle, var(--border-subtle)); padding-top: 12px; }
    .mode-autonomy-grid { display: flex; flex-direction: column; gap: 4px; }
    .mode-autonomy-row {
      display: flex; align-items: baseline; gap: 8px;
      padding: 4px 8px; border-radius: var(--radius-sm);
      background: var(--surface-ice, var(--surface-ice));
      font-size: var(--font-size-xs);
    }
    .mode-autonomy-level { font-weight: 800; font-size: var(--font-size-sm); min-width: 22px; }
    .mode-autonomy-name { font-weight: 600; color: var(--text-heading, var(--text-heading)); min-width: 80px; }
    .mode-autonomy-desc { color: var(--text-muted, var(--text-muted)); flex: 1; }
  `]
})
export class PlatformModeBadgeComponent {
  modeService = inject(PlatformModeService);
  i18n = inject(I18nService);

  modes = PLATFORM_MODES;
  dialogVisible = false;
  @Input() collapsed = false;

  autonomyLevels = [
    { code: 'L0', name: 'Assist', nameAr: 'مساعدة', desc: 'Drafts & proposals only', descAr: 'مسودات ومقترحات فقط', color: '#10b981' },
    { code: 'L1', name: 'Execute + Approve', nameAr: 'تنفيذ + موافقة', desc: 'Agent proposes, human approves', descAr: 'الوكيل يقترح، الإنسان يوافق', color: '#3b82f6' },
    { code: 'L2', name: 'Auto within Policy', nameAr: 'تلقائي ضمن السياسة', desc: 'Low-risk auto, high-risk queued', descAr: 'منخفض المخاطر تلقائي، مرتفع ينتظر', color: '#f59e0b' },
    { code: 'L3', name: 'Full Autonomous', nameAr: 'استقلالية كاملة', desc: 'All actions auto-execute + audit', descAr: 'جميع الإجراءات تلقائية + تدقيق', color: '#8b5cf6' },
  ];

  openDialog(): void {
    this.dialogVisible = true;
    this.modeService.loadRunStats();
    this.modeService.loadMemoryStats();
  }

  selectMode(mode: PlatformMode): void {
    this.modeService.setMode(mode);
    this.dialogVisible = false;
  }

  agentHasRuns(agentId: string): boolean {
    const stats = this.modeService.runStats();
    if (!stats) return false;
    return stats.agentBreakdown.some(b => b.agentId === agentId && b.runs > 0);
  }

  getAgentRunCount(agentId: string): number {
    const stats = this.modeService.runStats();
    if (!stats) return 0;
    return stats.agentBreakdown.find(b => b.agentId === agentId)?.runs ?? 0;
  }

}
