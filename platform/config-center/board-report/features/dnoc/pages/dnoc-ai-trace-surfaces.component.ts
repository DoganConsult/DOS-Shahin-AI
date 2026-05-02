/**
 * DNOC AI Trace Surfaces — saved-dashboard surface for the AI-OS.
 *
 * Langfuse v2 has no public dashboards API, so the equivalent of "saved
 * dashboards filtered by surface tag" is implemented here as a PrimeNG
 * card grid. Each card deep-links into Langfuse's trace list pre-filtered
 * by the corresponding `surface:*` tag. Live trace counts come from the
 * Langfuse public API via the engine-side proxy at /api/dnoc/ai/langfuse-counts
 * when available, otherwise the cards render as static deep-links.
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

interface SurfaceCard {
  tag: string;
  title: string;
  description: string;
  category: 'agent' | 'system' | 'public';
  badge: string;
}

@Component({
  selector: 'app-dnoc-ai-trace-surfaces',
  standalone: true,
  imports: [CommonModule, PageShellComponent, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-shell
      icon="pi pi-sitemap"
      [title]="i18n.translate('dnoc.traceSurfacesTitle')"
      [subtitle]="i18n.translate('dnoc.traceSurfacesSubtitle')"
      [breadcrumbs]="['Administration', 'DNOC', 'Trace Surfaces']"
      [loading]="false">

      <div headerActions>
        <a [href]="overviewUrl" target="_blank" rel="noopener" style="text-decoration:none">
          <p-button icon="pi pi-external-link" label="Open AI-OS in Langfuse"
                    styleClass="p-button-sm" />
        </a>
      </div>

      @for (group of groups; track group.title) {
        <div class="mb-4">
          <div class="flex align-items-center gap-2 mb-3">
            <span class="text-lg font-semibold">{{ group.title }}</span>
            <p-tag [value]="group.cards.length + ''" severity="secondary" styleClass="text-xs" />
          </div>
          <div class="grid">
            @for (c of group.cards; track c.tag) {
              <div class="col-12 md:col-6 lg:col-4 xl:col-3">
                <a [href]="urlFor(c.tag)" target="_blank" rel="noopener" class="trace-card"
                   [class]="'trace-card trace-card--' + c.category">
                  <div class="flex align-items-center justify-content-between mb-2">
                    <p-tag [value]="c.badge"
                           [severity]="c.category === 'agent' ? 'info' : c.category === 'system' ? 'warning' : 'success'"
                           styleClass="text-xs font-bold" />
                    @if (counts()[c.tag] != null) {
                      <span class="trace-card__count">{{ counts()[c.tag] }} traces · 24h</span>
                    }
                  </div>
                  <div class="trace-card__title">{{ c.title }}</div>
                  <div class="trace-card__tag">{{ c.tag }}</div>
                  <div class="trace-card__desc">{{ c.description }}</div>
                  <div class="trace-card__cta">
                    <i class="pi pi-external-link mr-1"></i>Open in Langfuse
                  </div>
                </a>
              </div>
            }
          </div>
        </div>
      }

      <div class="surface-ground p-3 border-round mt-4 text-xs text-color-secondary" style="line-height:1.6">
        <i class="pi pi-info-circle mr-1"></i>
        Tag taxonomy authoritative source: <code>packages/dos-platform-core/src/observability/langfuse.ts</code>.
        New AI surfaces should publish traces with a single <code>surface:&lt;slug&gt;</code> tag and be added
        to this dashboard. Per-trace cost is computed from Anthropic input/output token rates set in
        platform/config-center/env/ai-engine-service.env.
      </div>
    </app-page-shell>
  `,
  styles: [`
    :host { display: block; }
    code { background: var(--surface-100); padding: 1px 4px; border-radius: 3px; font-size: 11px; font-family: var(--font-family-mono, monospace); }

    .trace-card {
      display: block;
      padding: 16px;
      border: 1px solid var(--surface-200);
      border-radius: 10px;
      background: var(--surface-card);
      text-decoration: none;
      color: var(--text-color);
      transition: all 0.15s ease;
      height: 100%;
    }
    .trace-card:hover {
      border-color: var(--primary-color);
      box-shadow: 0 8px 24px -8px rgba(0,0,0,0.12);
      transform: translateY(-2px);
    }
    .trace-card__title { font-size: 15px; font-weight: 700; margin: 8px 0 2px; }
    .trace-card__tag { font-family: var(--font-family-mono, monospace); font-size: 11px; color: var(--text-color-secondary); margin-bottom: 8px; }
    .trace-card__desc { font-size: 12px; color: var(--text-color-secondary); line-height: 1.5; }
    .trace-card__count { font-size: 11px; font-weight: 600; }
    .trace-card__cta { margin-top: 12px; font-size: 12px; color: var(--primary-color); font-weight: 600; }
  `],
})
export class DnocAiTraceSurfacesComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);

  private readonly LF_BASE = '/admin/langfuse';
  private readonly LF_PROJECT = 'ai-engine-service';

  counts = signal<Record<string, number>>({});

  readonly overviewUrl = `${this.LF_BASE}/project/${this.LF_PROJECT}/traces`;

  readonly groups: Array<{ title: string; cards: SurfaceCard[] }> = [
    {
      title: 'Agent Squad — 13 Canonical AGRC Agents',
      cards: [
        { tag: 'surface:agent-A01', title: 'A01 Onboarding Agent', description: 'Onboarding domain — tenant + user activation flows.', category: 'agent', badge: 'A01' },
        { tag: 'surface:agent-A02', title: 'A02 Identity Provisioning Agent', description: 'Identity & RBAC domain — Keycloak/FGA tuple writes, role assignments.', category: 'agent', badge: 'A02' },
        { tag: 'surface:agent-A03', title: 'A03 Framework Mapping Agent', description: 'Frameworks domain — regulatory framework crosswalks and coverage.', category: 'agent', badge: 'A03' },
        { tag: 'surface:agent-A04', title: 'A04 Control Authoring Agent', description: 'Controls domain — control authoring, control-objective mapping.', category: 'agent', badge: 'A04' },
        { tag: 'surface:agent-A05', title: 'A05 Evidence Collection Agent', description: 'Evidence domain — harvest, freshness checks, attestation linkage.', category: 'agent', badge: 'A05' },
        { tag: 'surface:agent-A06', title: 'A06 Gap Remediation Agent', description: 'Roadmaps domain — gap-driven remediation roadmap generation.', category: 'agent', badge: 'A06' },
        { tag: 'surface:agent-A07', title: 'A07 Risk Register Agent', description: 'Risk Scoring domain — inherent + residual risk register, control effectiveness.', category: 'agent', badge: 'A07' },
        { tag: 'surface:agent-A08', title: 'A08 Policy Lifecycle Agent', description: 'Governance domain — policy authoring, review, approval, publication.', category: 'agent', badge: 'A08' },
        { tag: 'surface:agent-A09', title: 'A09 Third-Party Risk Agent', description: 'Third-Party domain — vendor due diligence, ongoing TPRM monitoring.', category: 'agent', badge: 'A09' },
        { tag: 'surface:agent-A10', title: 'A10 Audit Reporting Agent', description: 'Audit Reports domain — internal/external audit narrative + evidence packs.', category: 'agent', badge: 'A10' },
        { tag: 'surface:agent-A11', title: 'A11 BCP Continuity Agent', description: 'Business Continuity domain — BCP/DR plans, exercises, crisis activation.', category: 'agent', badge: 'A11' },
        { tag: 'surface:agent-A12', title: 'A12 Security Awareness & Training Agent', description: 'Training & Awareness domain — adaptive curricula, completion analytics.', category: 'agent', badge: 'A12' },
        { tag: 'surface:agent-A13', title: 'A13 Landing Copilot Agent', description: 'Public Copilot domain — anonymous landing-page Q&A, demo CTA, doc lookup. Dual-tagged with surface:landing-copilot.', category: 'agent', badge: 'A13' },
      ],
    },
    {
      title: 'AI Operating System — Infrastructure Surfaces',
      cards: [
        { tag: 'surface:openclaw-a2a',    title: 'OpenClaw A2A',       description: 'Agent-to-agent calls (handoffs, delegations) routed through the OpenClaw A2A protocol.', category: 'system', badge: 'A2A' },
        { tag: 'surface:mcp-tool',        title: 'MCP Tools',          description: 'Model Context Protocol tool invocations through the MCP gateway service.', category: 'system', badge: 'MCP' },
        { tag: 'surface:rag-search',      title: 'RAG Search',         description: 'Retrieval Augmented Generation queries against the corpus indices.', category: 'system', badge: 'RAG' },
        { tag: 'surface:agent-lifecycle', title: 'Agent Lifecycle',    description: 'Registry / gating / cost-cap / SoD policy decisions across agent runs.', category: 'system', badge: 'CTL' },
      ],
    },
  ];

  ngOnInit(): void {
    void this.loadCounts();
  }

  urlFor(tag: string): string {
    const filter = JSON.stringify([{
      type: 'stringOptions', column: 'tags', operator: 'any of', value: [tag],
    }]);
    return `${this.LF_BASE}/project/${this.LF_PROJECT}/traces?filter=${encodeURIComponent(filter)}`;
  }

  private async loadCounts(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ counts: Record<string, number> }>('/api/dnoc/ai/langfuse-counts'),
      );
      if (res?.counts) this.counts.set(res.counts);
    } catch {
      // Endpoint optional — cards still link out to Langfuse without counts.
    }
  }
}
