/**
 * AGRC-OS Wiring Status Widget
 * Shows at a glance which subsystems are actually wired and active (data/config present).
 */
import { Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AGRCOSService } from '@app/services/agrc-os.service';
import { forkJoin } from 'rxjs';

interface WiringStatusSnapshot {
  cyclesLast24h?: number;
  lastCycle?: string;
}

interface WiringEventStats {
  total?: number;
}

interface WiringRunbook {
  enabled?: boolean;
}

interface AgrcWiringSnapshot {
  status?: WiringStatusSnapshot;
  riskAppetite?: unknown[];
  gateLog?: unknown[];
  runbooks?: WiringRunbook[];
  ccmHistory?: unknown[];
  eventStats?: WiringEventStats;
  sops?: unknown[];
}

export interface WiringLayer {
  id: string;
  labelKey: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  wired: boolean;
  actionNote?: string; // e.g. "3 enabled", "12 events"
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-agrc-wiring-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="agrc-wiring-widget">
      <h4 class="wiring-title">
        <i class="pi pi-sitemap"></i>
        {{ i18n.translate('widgets.agrcWiringStatus.title') }}
      </h4>
      <div class="wiring-grid">
        <div *ngFor="let layer of layers" class="wiring-row" [class.wired]="layer.wired" [class.not-wired]="!layer.wired">
          <span class="wiring-indicator" [class.on]="layer.wired" [class.off]="!layer.wired">
            <i class="pi" [ngClass]="layer.wired ? 'pi-check-circle' : 'pi-circle'"></i>
          </span>
          <span class="wiring-icon"><i class="pi" [ngClass]="layer.icon"></i></span>
          <span class="wiring-label">{{ i18n.localize(layer.labelEn, layer.labelAr) }}</span>
          <span class="wiring-note" *ngIf="layer.actionNote">{{ layer.actionNote }}</span>
        </div>
      </div>
      <p class="wiring-legend" *ngIf="loaded">
        {{ wiredCount }} / {{ layers.length }} {{ i18n.translate('widgets.agrcWiringStatus.wired') }}
      </p>
    </div>
  `,
  styles: [`
    .agrc-wiring-widget { padding: var(--space-md, 12px); }
    .wiring-title { margin: 0 0 12px; font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading, var(--text-heading)); display: flex; align-items: center; gap: 8px; }
    .wiring-title .pi { color: var(--primary, var(--primary)); }
    .wiring-grid { display: flex; flex-direction: column; gap: 6px; }
    .wiring-row {
      display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: var(--radius);
      font-size: var(--font-size-sm); background: var(--surface-ice, var(--surface-ice));
    }
    .wiring-row.wired { background: rgba(34, 197, 94, 0.08); }
    .wiring-row.not-wired { opacity: 0.75; }
    .wiring-indicator { width: 20px; text-align: center; flex-shrink: 0; }
    .wiring-indicator.on { color: var(--success); }
    .wiring-indicator.off { color: var(--text-muted); }
    .wiring-icon { width: 20px; color: var(--text-muted, var(--text-muted)); flex-shrink: 0; }
    .wiring-label { flex: 1; font-weight: 500; color: var(--text-body, #334155); }
    .wiring-note { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .wiring-legend { margin: 10px 0 0; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); }
  `],
})
export class AgrcWiringStatusWidget implements OnInit {
  i18n = inject(I18nService);
  private agrc = inject(AGRCOSService);

  layers: WiringLayer[] = [];
  loaded = false;
  get wiredCount(): number {
    return this.layers.filter(l => l.wired).length;
  }

  ngOnInit(): void {
    forkJoin({
      status: this.agrc.getStatus(),
      riskAppetite: this.agrc.getRiskAppetite(),
      gateLog: this.agrc.getGateLog({ limit: 1 }),
      runbooks: this.agrc.getRunbooks(),
      ccmHistory: this.agrc.getCCMHistory(1),
      eventStats: this.agrc.getEventStats(24),
      sops: this.agrc.getSOPs(),
    }).subscribe({
      next: (data: AgrcWiringSnapshot) => {
        const runbooks = data.runbooks ?? [];
        const enabledRunbooks = runbooks.filter((r) => r.enabled !== false).length;
        this.layers = [
          {
            id: 'orchestrator',
            labelKey: 'agrcOs.orchestrator',
            labelEn: 'Orchestrator',
            labelAr: 'المُوجّه',
            icon: 'pi-sync',
            wired: !!(data.status && (data.status.cyclesLast24h != null || data.status.lastCycle)),
            actionNote: data.status?.cyclesLast24h != null ? `${data.status.cyclesLast24h} cycles/24h` : undefined,
          },
          {
            id: 'constitution',
            labelKey: 'agrcOs.constitution',
            labelEn: 'Constitution',
            labelAr: 'الدستور',
            icon: 'pi-file-edit',
            wired: Array.isArray(data.riskAppetite) && data.riskAppetite.length > 0,
            actionNote: Array.isArray(data.riskAppetite) ? `${data.riskAppetite.length} rules` : undefined,
          },
          {
            id: 'gates',
            labelKey: 'agrcOs.gates',
            labelEn: 'Gates',
            labelAr: 'البوابات',
            icon: 'pi-shield',
            wired: Array.isArray(data.gateLog) && data.gateLog.length > 0,
            actionNote: Array.isArray(data.gateLog) && data.gateLog.length ? 'active' : undefined,
          },
          {
            id: 'telemetry',
            labelKey: 'agrcOs.telemetry',
            labelEn: 'Telemetry',
            labelAr: 'البيانات عن بُعد',
            icon: 'pi-wifi',
            wired: !!(data.eventStats && (data.eventStats.total ?? 0) > 0),
            actionNote: data.eventStats?.total != null ? `${data.eventStats.total} events` : undefined,
          },
          {
            id: 'ccm',
            labelKey: 'agrcOs.ccm',
            labelEn: 'CCM',
            labelAr: 'CCM',
            icon: 'pi-refresh',
            wired: Array.isArray(data.ccmHistory) && data.ccmHistory.length > 0,
            actionNote: Array.isArray(data.ccmHistory) ? `${data.ccmHistory.length} runs` : undefined,
          },
          {
            id: 'runbooks',
            labelKey: 'agrcOs.runbooks',
            labelEn: 'Runbooks',
            labelAr: 'دفاتر التشغيل',
            icon: 'pi-list',
            wired: runbooks.length > 0,
            actionNote: runbooks.length ? `${enabledRunbooks}/${runbooks.length} on` : undefined,
          },
          {
            id: 'sops',
            labelKey: 'agrcOs.sops',
            labelEn: 'SOPs',
            labelAr: 'إجراءات التشغيل',
            icon: 'pi-book',
            wired: Array.isArray(data.sops) && data.sops.length > 0,
            actionNote: Array.isArray(data.sops) ? `${data.sops.length} SOPs` : undefined,
          },
        ];
        this.loaded = true;
      },
      error: () => {
        this.layers = [
          { id: 'orchestrator', labelKey: 'agrcOs.orchestrator', labelEn: 'Orchestrator', labelAr: 'المُوجّه', icon: 'pi-sync', wired: false },
          { id: 'constitution', labelKey: 'agrcOs.constitution', labelEn: 'Constitution', labelAr: 'الدستور', icon: 'pi-file-edit', wired: false },
          { id: 'gates', labelKey: 'agrcOs.gates', labelEn: 'Gates', labelAr: 'البوابات', icon: 'pi-shield', wired: false },
          { id: 'telemetry', labelKey: 'agrcOs.telemetry', labelEn: 'Telemetry', labelAr: 'البيانات عن بُعد', icon: 'pi-wifi', wired: false },
          { id: 'ccm', labelKey: 'agrcOs.ccm', labelEn: 'CCM', labelAr: 'CCM', icon: 'pi-refresh', wired: false },
          { id: 'runbooks', labelKey: 'agrcOs.runbooks', labelEn: 'Runbooks', labelAr: 'دفاتر التشغيل', icon: 'pi-list', wired: false },
          { id: 'sops', labelKey: 'agrcOs.sops', labelEn: 'SOPs', labelAr: 'إجراءات التشغيل', icon: 'pi-book', wired: false },
        ];
        this.loaded = true;
      },
    });
  }

}
