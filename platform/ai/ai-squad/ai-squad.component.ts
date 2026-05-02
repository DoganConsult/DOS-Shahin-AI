import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe, AppNumberPipe } from '@app/shared/pipes';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressRingChartComponent } from '@app/shared/widgets/d3-charts';
import { GaugeChartComponent } from '@app/shared/widgets/d3-charts';
import { SparklineChartComponent } from '@app/shared/widgets/d3-charts';
import * as d3 from 'd3';
import { ApiClientService } from "@app/core/services/api-client.service";

interface AgentNode extends d3.SimulationNodeDatum {
  id: string;
  agentId: string;
  nameEn: string;
  nameAr: string;
  role: string;
  specialization: string;
  status: string;
  totalTasksCompleted: number;
  successRate: number;
  avgResponseTimeMs: number;
  icon: string;
  color: string;
  domain: string;
}

interface AgentLink extends d3.SimulationLinkDatum<AgentNode> {
  value: number;
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'var(--text-muted)',
  working: '#3b82f6',
  completed: 'var(--success)',
  error: 'var(--error)',
  disabled: 'var(--text-muted)',
};

const AGENT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

@Component({
  selector: 'app-ai-squad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, PageShellComponent, CardModule, TagModule, ButtonModule, TooltipModule,
    ProgressRingChartComponent, GaugeChartComponent, SparklineChartComponent, AppDatePipe, AppNumberPipe,],
  template: `
    <app-page-shell icon="users" [title]="i18n.translate('aiSquad.title')"
      [subtitle]="i18n.translate('aiSquad.subtitle')"
      [breadcrumbs]="['Dashboard', 'AI Squad']" [loading]="loading">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadSquad()" />
        <p-button icon="pi pi-bolt" [label]="i18n.translate('aiSquad.seedSquad')" (onClick)="seedSquad()" [loading]="seeding" />
      </div>

      <div class="squad-layout">
        <div class="network-panel">
          <div class="panel-header">
            <h2>{{ i18n.translate('aiSquad.agentNetwork') }}</h2>
            <span *ngIf="lastLoadedAt" class="sync-time">{{ lastLoadedAt | appDate:'relative' }}</span>
            <div class="legend">
              @for (s of statusKeys; track s) {
                <span class="legend-item"><span class="legend-dot" [style.background]="statusColor(s)"></span>{{ s }}</span>
              }
            </div>
          </div>
          <div #networkContainer class="network-svg"></div>
        </div>

        <div class="kpi-strip">
          <div class="kpi-card">
            <app-progress-ring-chart [value]="totalActive" [max]="10" [size]="72" [color]="'#22c55e'" label="Active" />
            <span class="kpi-label">{{ i18n.translate('common.active') }}</span>
          </div>
          <div class="kpi-card">
            <app-progress-ring-chart [value]="totalTasks" [max]="totalTasks || 1" [size]="72" [color]="'#3b82f6'" label="" />
            <span class="kpi-label">{{ totalTasks }} {{ i18n.translate('aiSquad.tasks') }}</span>
          </div>
          <div class="kpi-card">
            <app-gauge-chart [value]="avgSuccessRate" [max]="100" [size]="100" label="Success %" />
            <span class="kpi-label">{{ i18n.translate('aiSquad.avgSuccess') }}</span>
          </div>
          <div class="kpi-card">
            <app-sparkline-chart [data]="responseTrend" [width]="120" [height]="40" [color]="'#8b5cf6'" />
            <span class="kpi-label">{{ i18n.translate('aiSquad.responseTime') }}</span>
          </div>
        </div>

        <div class="agents-grid">
          @for (agent of agents; track agent.agentId) {
            <div class="agent-card" [class.agent-working]="agent.status === 'working'" [class.agent-error]="agent.status === 'error'">
              <div class="agent-card-header">
                <div class="agent-avatar" [style.background]="agent.color || agentColor(agent.agentId)">
                  <i class="pi" [ngClass]="agent.icon || 'pi-microchip-ai'" style="font-size: var(--font-size-lg)"></i>
                </div>
                <div class="agent-info">
                  <h3>{{ agent.nameEn }}</h3>
                  <span class="agent-name-ar" dir="rtl">{{ agent.nameAr }}</span>
                </div>
                <p-tag [value]="agent.status" [severity]="statusSeverity(agent.status)" [rounded]="true" />
              </div>
              <div class="agent-role">
                <span class="agent-domain-badge" [style.background]="(agent.color || agentColor(agent.agentId)) + '1a'" [style.color]="agent.color || agentColor(agent.agentId)">{{ agent.domain || agent.agentId }}</span>
                {{ agent.specialization }}
              </div>
              <div class="agent-metrics">
                <div class="metric">
                  <app-progress-ring-chart [value]="agent.successRate" [max]="100" [size]="52" [strokeWidth]="5" [color]="agentColor(agent.agentId)" />
                  <span class="metric-label">{{ agent.successRate | appNumber:'decimal':'1.0-0' }}%</span>
                </div>
                <div class="metric">
                  <div class="metric-big">{{ agent.totalTasksCompleted }}</div>
                  <span class="metric-label">{{ i18n.translate('aiSquad.tasks') }}</span>
                </div>
                <div class="metric">
                  <div class="metric-big">{{ agent.avgResponseTimeMs | appNumber:'decimal':'1.0-0' }}<small>ms</small></div>
                  <span class="metric-label">{{ i18n.translate('aiSquad.avg') }}</span>
                </div>
              </div>
              <div class="agent-pulse" [class.pulse-active]="agent.status === 'working'"></div>
            </div>
          }
          @empty {
            <div class="empty-squad">
              <i class="pi pi-users" style="font-size:3rem;opacity:0.3"></i>
              <p>{{ i18n.translate('aiSquad.notSeeded') }}</p>
            </div>
          }
        </div>
      </div>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .squad-layout { display: flex; flex-direction: column; gap: 24px; }
    .network-panel { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); }
    .panel-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; }
    .sync-time { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-end: auto; }
    .panel-header h2 { margin: 0; font-size: var(--font-size-md); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .legend { display: flex; gap: 12px; font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-dot { width: 8px; height: 8px; border-radius: var(--radius-pill); }
    .network-svg { width: 100%; height: 340px; overflow: hidden; border-radius: var(--radius); background: var(--surface-ground, var(--surface-ice)); }

    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .kpi-card { display: flex; flex-direction: column; align-items: center; gap: 8px; background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 16px; box-shadow: var(--shadow-sm); }
    .kpi-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); }

    .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .agent-card { position: relative; background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); border-inline-start: 4px solid transparent; transition: transform 0.2s, box-shadow 0.2s; overflow: hidden; }
    .agent-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .agent-card.agent-working { border-inline-start-color: var(--primary); }
    .agent-card.agent-error { border-inline-start-color: var(--error); }
    .agent-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .agent-avatar { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); font-weight: 800; color: #fff; flex-shrink: 0; }
    .agent-info { flex: 1; min-width: 0; }
    .agent-info h3 { margin: 0; font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, var(--text-heading)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .agent-name-ar { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .agent-role { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin-bottom: 12px; line-height: 1.4; display: flex; align-items: center; gap: 8px; }
    .agent-domain-badge { font-size: var(--font-size-xs); font-weight: 700; padding: 2px 8px; border-radius: var(--radius-pill); white-space: nowrap; }
    .agent-metrics { display: flex; align-items: center; gap: 16px; }
    .metric { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .metric-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); font-weight: 600; }
    .metric-big { font-size: var(--font-size-xl); font-weight: 800; color: var(--text-heading, var(--text-heading)); }
    .metric-big small { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); }
    .agent-pulse { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; border-radius: var(--radius-pill); background: var(--text-muted, var(--text-muted)); }
    .agent-pulse.pulse-active { background: var(--primary); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(var(--module-accent-blue-rgb), 0.4); } 50% { box-shadow: 0 0 0 8px rgba(var(--module-accent-blue-rgb), 0); } }

    .empty-squad { grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted, var(--text-muted)); }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}

    @media (max-width: 768px) {
      .kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .agents-grid { grid-template-columns: 1fr; }
      .network-svg { height: 240px; }
    }
  `]
})
export class AISquadComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('networkContainer') networkEl!: ElementRef<HTMLDivElement>;

  loading = false;
  seeding = false;
  error = '';
  agents: AgentNode[] = [];
  statusKeys = ['idle', 'working', 'completed', 'error', 'disabled'];
  totalActive = 0;
  totalTasks = 0;
  avgSuccessRate = 0;
  responseTrend: number[] = [];
  lastLoadedAt: Date | null = null;

  private simulation: d3.Simulation<AgentNode, AgentLink> | null = null;

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.loadSquad(); }

  ngAfterViewInit() {
    if (this.agents.length) this.renderNetwork();
  }

  ngOnDestroy() {
    this.simulation?.stop();
    if (this.networkEl?.nativeElement) {
      d3.select(this.networkEl.nativeElement).selectAll('*').remove();
    }
  }

  loadSquad() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.apiclientSvc.get('/ai-squad').subscribe({
      next: (data: any) => {
        const raw = data?.agents || [];
        this.agents = raw.map((a: Record<string, unknown>, i: number) => ({
          id: a.agentId || a.agent_id || `A${String(i + 1).padStart(2, '0')}`,
          agentId: a.agentId || a.agent_id || `A${String(i + 1).padStart(2, '0')}`,
          nameEn: a.nameEn || a.name_en || a.agentId,
          nameAr: a.nameAr || a.name_ar || '',
          role: a.role || '',
          specialization: a.specialization || '',
          status: a.status || 'idle',
          totalTasksCompleted: a.totalTasksCompleted ?? a.total_tasks_completed ?? 0,
          successRate: a.successRate ?? a.success_rate ?? 0,
          avgResponseTimeMs: a.avgResponseTimeMs ?? a.avg_response_time_ms ?? 0,
          icon: a.icon || 'pi-microchip-ai',
          color: a.color || '',
          domain: a.domain || '',
        }));
        this.computeKPIs();
        this.lastLoadedAt = new Date();
        this.loading = false;
        this.cdr.markForCheck();
        setTimeout(() => this.renderNetwork(), 50);
      },
      error: () => { this.error = 'Failed to load data'; this.agents = []; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  seedSquad() {
    this.seeding = true;
    this.cdr.markForCheck();
    this.apiclientSvc.post('/ai-squad/seed', {}).subscribe({
      next: () => { this.seeding = false; this.loadSquad(); },
      error: () => { this.seeding = false; this.cdr.markForCheck(); }
    });
  }

  statusColor(s: string): string { return STATUS_COLORS[s] || 'var(--text-muted)'; }

  agentColor(agentId: string): string {
    const idx = parseInt(agentId.replace(/\D/g, ''), 10) - 1;
    return AGENT_COLORS[idx % AGENT_COLORS.length];
  }

  statusSeverity(s: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    if (s === 'working') return 'info';
    if (s === 'completed') return 'success';
    if (s === 'error') return 'danger';
    if (s === 'disabled') return 'secondary';
    return 'secondary';
  }

  private computeKPIs() {
    this.totalActive = this.agents.filter(a => a.status === 'working' || a.status === 'idle').length;
    this.totalTasks = this.agents.reduce((s, a) => s + a.totalTasksCompleted, 0);
    this.avgSuccessRate = this.agents.length
      ? Math.round(this.agents.reduce((s, a) => s + a.successRate, 0) / this.agents.length)
      : 0;
    this.responseTrend = this.agents.map(a => a.avgResponseTimeMs || 0);
  }

  private renderNetwork() {
    if (!this.networkEl?.nativeElement || !this.agents.length) return;
    const el = this.networkEl.nativeElement;
    d3.select(el).selectAll('*').remove();

    const width = el.clientWidth || 600;
    const height = 340;
    const nodes: AgentNode[] = this.agents.map(a => ({ ...a }));

    const links: AgentLink[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() > 0.55) {
          links.push({ source: nodes[i], target: nodes[j], value: Math.random() * 3 + 0.5 });
        }
      }
    }

    const svg = d3.select(el).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');
    AGENT_COLORS.forEach((c, i) => {
      const grad = defs.append('radialGradient').attr('id', `agent-grad-${i}`);
      grad.append('stop').attr('offset', '0%').attr('stop-color', c).attr('stop-opacity', 0.9);
      grad.append('stop').attr('offset', '100%').attr('stop-color', c).attr('stop-opacity', 0.6);
    });

    const linkGroup = svg.append('g');
    const nodeGroup = svg.append('g');

    const linkEls = linkGroup.selectAll('line')
      .data(links).enter().append('line')
      .attr('stroke', '#cbd5e1').attr('stroke-opacity', 0.4)
      .attr('stroke-width', (d: AgentLink) => d.value);

    const nodeEls = nodeGroup.selectAll('g')
      .data(nodes).enter().append('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, AgentNode>()
        .on('start', (event, d) => {
          if (!event.active) this.simulation?.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) this.simulation?.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    nodeEls.append('circle')
      .attr('r', 0)
      .attr('fill', (d: AgentNode) => {
        const idx = parseInt(d.agentId.replace(/\D/g, ''), 10) - 1;
        return `url(#agent-grad-${idx % 10})`;
      })
      .attr('stroke', (d: AgentNode) => STATUS_COLORS[d.status] || 'var(--text-muted)')
      .attr('stroke-width', 3)
      .transition().duration(800).delay((_, i) => i * 80)
      .attr('r', 22);

    nodeEls.append('text')
      .text((d: AgentNode) => d.agentId)
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', '#fff').attr('font-size', '10px').attr('font-weight', '800')
      .attr('opacity', 0)
      .transition().delay((_, i) => i * 80 + 400).duration(400).attr('opacity', 1);

    nodeEls.append('title')
      .text((d: AgentNode) => `${d.nameEn}\n${d.specialization}\nStatus: ${d.status}\nTasks: ${d.totalTasksCompleted}`);

    this.simulation = d3.forceSimulation<AgentNode>(nodes)
      .force('link', d3.forceLink<AgentNode, AgentLink>(links).id(d => d.id).distance(90).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      .on('tick', () => {
        linkEls
          .attr('x1', (d: Record<string, unknown>) => d.source.x).attr('y1', (d: Record<string, unknown>) => d.source.y)
          .attr('x2', (d: Record<string, unknown>) => d.target.x).attr('y2', (d: Record<string, unknown>) => d.target.y);
        nodeEls.attr('transform', (d: AgentNode) => `translate(${d.x},${d.y})`);
      });
  }
}
